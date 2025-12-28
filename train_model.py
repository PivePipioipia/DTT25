"""
Stacking Ensemble Trainer for Dry Eye Disease Prediction
Usage: python train_model.py
"""

import pandas as pd
import numpy as np
import json
import os
import pickle
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, recall_score, f1_score, confusion_matrix
from sklearn.ensemble import GradientBoostingClassifier, HistGradientBoostingClassifier
from imblearn.over_sampling import SMOTE, RandomOverSampler
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

np.random.seed(42)
tf.random.set_seed(42)


class StackingEnsembleTrainer:
    def __init__(self, config_path='training_config.json', data_path='Dry_Eye_Dataset.csv'):
        self.config_path = config_path
        self.data_path = data_path
        self.load_config()
        
    def load_config(self):
        """Load configuration from training_config.json"""
        with open(self.config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.features = self.config['features']['refined_features']
        self.preprocessing_config = self.config['preprocessing']
        self.base_models_config = self.config['base_models']
        self.target_col = self.config['dataset']['target_column']
        
        print(f"✓ Loaded config from {self.config_path}")
        print(f"✓ Features: {len(self.features)}")
        
    def preprocess_data(self):
        """Load and preprocess data based on config"""
        df = pd.read_csv(self.data_path)
        
        # Auto-detect and encode ALL Y/N columns FIRST
        for col in df.columns:
            if df[col].dtype == 'object':
                unique_vals = set(df[col].dropna().unique())
                if unique_vals.issubset({'Y', 'N'}):
                    df[col] = df[col].map({'Y': 1, 'N': 0})
        
        # Gender encoding (M/F support)
        if 'Gender' in df.columns:
            df['Gender'] = df['Gender'].map({'M': 1, 'Male': 1, 'F': 0, 'Female': 0})
        
        # Blood pressure split AFTER Y/N encoding
        if 'Blood pressure' in df.columns:
            df[['Systolic_BP', 'Diastolic_BP']] = df['Blood pressure'].str.split('/', expand=True).astype(float)
        
        # Handle target column name mismatch
        if 'Dry Eye Disease' in df.columns and 'Dry_Eye_Disease' not in df.columns:
            df['Dry_Eye_Disease'] = df['Dry Eye Disease']
        
        self.X = df[self.features].copy()
        self.y = df['Dry_Eye_Disease'].copy()
        print(f"✓ Data shape: {self.X.shape}, Classes: 0={sum(self.y==0)}, 1={sum(self.y==1)}")
        
    def init_base_models(self):
        """Initialize base models from config"""
        self.base_models = [
            XGBClassifier(**self.base_models_config['xgboost']),
            LGBMClassifier(**self.base_models_config['lightgbm']),
            CatBoostClassifier(**self.base_models_config['catboost']),
            GradientBoostingClassifier(**self.base_models_config['gradientboosting']),
            HistGradientBoostingClassifier(**self.base_models_config['histgradientboosting'])
        ]
        self.base_names = ['XGBoost', 'LightGBM', 'CatBoost', 'GradientBoosting', 'HistGradientBoosting']
        print(f"✓ Initialized {len(self.base_models)} base models")
        
    def train_base_models(self, n_splits=5):
        """Train base models with K-Fold CV"""
        print(f"\n[K-Fold CV: {n_splits} folds]")
        kf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
        
        # Scale data
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(self.X)
        
        # OOF predictions
        oof_preds = {name: np.zeros(len(self.y)) for name in self.base_names}
        
        for fold, (train_idx, val_idx) in enumerate(kf.split(X_scaled, self.y), 1):
            X_train, X_val = X_scaled[train_idx], X_scaled[val_idx]
            y_train, y_val = self.y.iloc[train_idx], self.y.iloc[val_idx]
            
            # SMOTE
            smote = SMOTE(sampling_strategy=0.7, random_state=42)
            X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)
            
            # Train each model
            for model, name in zip(self.base_models, self.base_names):
                model.fit(X_train_sm, y_train_sm)
                oof_preds[name][val_idx] = model.predict_proba(X_val)[:, 1]
            
            print(f"Fold {fold} completed")
        
        # Prepare NN input
        oof_array = np.column_stack([oof_preds[name] for name in self.base_names])
        self.X_nn = np.column_stack((X_scaled, oof_array))
        print(f"✓ NN input shape: {self.X_nn.shape}")
        
    def build_nn(self):
        """Build Neural Network meta-learner"""
        self.nn_model = Sequential([
            Dense(256, activation='relu', input_shape=(self.X_nn.shape[1],)),
            BatchNormalization(),
            Dropout(0.3),
            Dense(128, activation='relu'),
            BatchNormalization(),
            Dropout(0.2),
            Dense(64, activation='relu'),
            BatchNormalization(),
            Dropout(0.1),
            Dense(1, activation='sigmoid')
        ])
        self.nn_model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        
    def train_nn(self):
        """Train Neural Network"""
        print("\n[Training Neural Network]")
        
        # Oversample
        ros = RandomOverSampler(random_state=42)
        X_resampled, y_resampled = ros.fit_resample(self.X_nn, self.y)
        
        # Callbacks
        callbacks = [
            EarlyStopping(monitor='val_loss', patience=20, restore_best_weights=True),
            ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=10, min_lr=1e-5)
        ]
        
        # Train
        self.history = self.nn_model.fit(
            X_resampled, y_resampled,
            epochs=100, batch_size=32,
            validation_split=0.2,
            callbacks=callbacks,
            verbose=1
        )
        print("✓ Training completed")
        
    def evaluate(self):
        """Evaluate model"""
        y_pred = (self.nn_model.predict(self.X_nn).flatten() > 0.5).astype(int)
        
        self.metrics = {
            'accuracy': accuracy_score(self.y, y_pred),
            'f1_macro': f1_score(self.y, y_pred, average='macro'),
        }
        
        cm = confusion_matrix(self.y, y_pred)
        self.metrics['recall_0'] = cm[0,0] / (cm[0,0] + cm[0,1])
        self.metrics['recall_1'] = cm[1,1] / (cm[1,0] + cm[1,1])
        
        print(f"\n{'='*60}")
        print(f"Accuracy:      {self.metrics['accuracy']:.4f}")
        print(f"Recall (0):    {self.metrics['recall_0']:.4f}")
        print(f"Recall (1):    {self.metrics['recall_1']:.4f}")
        print(f"F1 Macro:      {self.metrics['f1_macro']:.4f}")
        print(f"{'='*60}")
        
    def save_model(self, output_dir='stacking_ensemble_model'):
        """Save all model components"""
        os.makedirs(output_dir, exist_ok=True)
        
        # NN model
        self.nn_model.save(os.path.join(output_dir, 'nn_meta_learner.h5'))
        
        # Base models
        for model, name in zip(self.base_models, self.base_names):
            with open(os.path.join(output_dir, f'base_model_{name.lower()}.pkl'), 'wb') as f:
                pickle.dump(model, f)
        
        # Scaler
        with open(os.path.join(output_dir, 'scaler.pkl'), 'wb') as f:
            pickle.dump(self.scaler, f)
        
        # Config
        config = {
            'features': self.features,
            'base_models': self.base_names,
            'performance': self.metrics
        }
        with open(os.path.join(output_dir, 'config.json'), 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"✓ Model saved to {output_dir}/")
        
    def train(self):
        """Run full training pipeline"""
        print("="*60)
        print("STACKING ENSEMBLE TRAINING")
        print("="*60)
        
        self.preprocess_data()
        self.init_base_models()
        self.train_base_models()
        self.build_nn()
        self.train_nn()
        self.evaluate()
        self.save_model()
        
        print("\nTraining completed!")


if __name__ == '__main__':
    trainer = StackingEnsembleTrainer()
    trainer.train()

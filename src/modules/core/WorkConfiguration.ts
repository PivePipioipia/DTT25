/**
 * Work Configuration Presets
 * Defines the behavior of the 4 intelligent modes.
 */

export interface WorkMode {
    id: string;
    label: string;
    description: string;
    checkIntervalSec: number;
    breakIntervalSec: number;
    forceBreak: boolean;
    allowSnooze: boolean;
    adaptive: boolean;
    silentSuccess?: boolean;
    silentMode?: boolean;
    suppressPopups?: boolean;
}

export const WORK_MODES: Record<string, WorkMode> = {
    STRICT: {
        id: 'strict',
        label: 'Strict (Bảo vệ tối đa)',
        description: 'Dành cho người có bệnh lý. Bắt buộc nghỉ, kiểm tra thường xuyên.',
        checkIntervalSec: 10 * 60,   // 10 mins
        breakIntervalSec: 20 * 60,   // 20 mins
        forceBreak: true,            // Cannot skip break
        allowSnooze: false,          // Cannot snooze notifications
        adaptive: false,             // Fixed intervals
        silentSuccess: false         // Always notify even if good (reinforcement)
    },
    BALANCED: {
        id: 'balanced',
        label: 'Balanced (Cân bằng)',
        description: 'Chế độ mặc định thông minh. Tự động điều chỉnh tần suất.',
        checkIntervalSec: 12.5 * 60, // 12.5 mins
        breakIntervalSec: 25 * 60,   // 25 mins
        forceBreak: false,
        allowSnooze: true,
        adaptive: true,              // ADAPTIVE FREQUENCY ENABLED
        silentSuccess: true          // Quiet when doing well
    },
    DEEP_FOCUS: {
        id: 'deep_focus',
        label: 'Deep Focus (Tập trung)',
        description: 'Tối ưu cho Flow. Chỉ nhắc nhở nhẹ bằng hình ảnh.',
        checkIntervalSec: 25 * 60,   // 25 mins
        breakIntervalSec: 50 * 60,   // 50 mins
        forceBreak: false,
        allowSnooze: true,
        adaptive: false,
        silentMode: true,            // No sounds
        suppressPopups: true         // Toast only, no modals
    },
    CUSTOM: {
        id: 'custom',
        label: 'Custom',
        description: 'Cấu hình cá nhân hóa.',
        checkIntervalSec: 15 * 60,
        breakIntervalSec: 30 * 60,
        forceBreak: false,
        allowSnooze: true,
        adaptive: false
    }
};

export const DEFAULT_MODE = WORK_MODES.BALANCED;

<?php

namespace App\Enums;

enum AlertType: string
{
    case FACE_MATCH = 'face_match';
    case SIGHTING_REPORT = 'sighting_report';
    case CASE_UPDATE = 'case_update';
    case SYSTEM = 'system';
    case HIGH_CONFIDENCE = 'high_confidence';

    /**
     * Get the display label for the alert type.
     */
    public function label(): string
    {
        return match ($this) {
            self::FACE_MATCH => 'Face Match',
            self::SIGHTING_REPORT => 'Sighting Report',
            self::CASE_UPDATE => 'Case Update',
            self::SYSTEM => 'System',
            self::HIGH_CONFIDENCE => 'High Confidence Alert',
        };
    }
}

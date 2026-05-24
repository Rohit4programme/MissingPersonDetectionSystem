<?php

namespace App\Enums;

enum SightingStatus: string
{
    case PENDING = 'pending';
    case VERIFIED = 'verified';
    case REJECTED = 'rejected';

    /**
     * Get the display label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending Review',
            self::VERIFIED => 'Verified',
            self::REJECTED => 'Rejected',
        };
    }
}

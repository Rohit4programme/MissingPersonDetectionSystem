<?php

namespace App\Enums;

enum AlertChannel: string
{
    case SMS = 'sms';
    case EMAIL = 'email';
    case PUSH = 'push';
    case WHATSAPP = 'whatsapp';
    case DASHBOARD = 'dashboard';

    /**
     * Get the display label for the channel.
     */
    public function label(): string
    {
        return match ($this) {
            self::SMS => 'SMS',
            self::EMAIL => 'Email',
            self::PUSH => 'Push Notification',
            self::WHATSAPP => 'WhatsApp',
            self::DASHBOARD => 'Dashboard',
        };
    }
}

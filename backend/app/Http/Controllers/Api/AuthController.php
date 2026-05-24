<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthController extends Controller
{
    /**
     * Register a new public user.
     */
    public function register(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => ['required', 'string', 'min:8', 'confirmed', PasswordRule::defaults()],
            ]);

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'public',
                'is_active' => true,
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            Log::info('User registered successfully.', ['user_id' => $user->id, 'email' => $user->email]);

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user,
                    'token' => $token,
                    'token_type' => 'Bearer',
                ],
                'message' => 'Registration successful.',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Registration failed.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Registration failed. Please try again.',
            ], 500);
        }
    }

    /**
     * Login with email and password.
     */
    public function login(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email',
                'password' => 'required|string',
            ]);

            if (!Auth::attempt($validated)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid credentials.',
                ], 401);
            }

            /** @var User $user */
            $user = Auth::user();

            if (!$user->is_active) {
                Auth::logout();
                return response()->json([
                    'success' => false,
                    'message' => 'Your account has been deactivated. Please contact an administrator.',
                ], 403);
            }

            // Revoke existing tokens (single device login)
            $user->tokens()->delete();

            $token = $user->createToken('auth_token')->plainTextToken;

            Log::info('User logged in.', ['user_id' => $user->id, 'email' => $user->email]);

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user,
                    'token' => $token,
                    'token_type' => 'Bearer',
                ],
                'message' => 'Login successful.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Login failed.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Login failed. Please try again.',
            ], 500);
        }
    }

    /**
     * Logout - revoke current token.
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $request->user()->currentAccessToken()->delete();

            Log::info('User logged out.', ['user_id' => $request->user()->id]);

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'Logged out successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error('Logout failed.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Logout failed.',
            ], 500);
        }
    }

    /**
     * Return the authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $user->loadCount(['cases', 'detections']);

            return response()->json([
                'success' => true,
                'data' => $user,
                'message' => 'User profile retrieved.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve user profile.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve profile.',
            ], 500);
        }
    }

    /**
     * Update user profile (name, phone, avatar).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'phone' => 'sometimes|nullable|string|max:20',
                'avatar' => 'sometimes|nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            /** @var User $user */
            $user = $request->user();

            if ($request->hasFile('avatar')) {
                // Delete old avatar if exists
                if ($user->avatar && \Storage::disk('public')->exists($user->avatar)) {
                    \Storage::disk('public')->delete($user->avatar);
                }
                $validated['avatar'] = $request->file('avatar')->store('avatars', 'public');
            }

            $user->update([
                'name' => $validated['name'] ?? $user->name,
                'phone' => $validated['phone'] ?? $user->phone,
                'avatar' => $validated['avatar'] ?? $user->avatar,
            ]);

            Log::info('User profile updated.', ['user_id' => $user->id]);

            return response()->json([
                'success' => true,
                'data' => $user->fresh(),
                'message' => 'Profile updated successfully.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Profile update failed.', ['user_id' => $request->user()->id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Profile update failed.',
            ], 500);
        }
    }

    /**
     * Change password (current + new).
     */
    public function changePassword(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'current_password' => 'required|string',
                'password' => ['required', 'string', 'min:8', 'confirmed', PasswordRule::defaults()],
            ]);

            /** @var User $user */
            $user = $request->user();

            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Current password is incorrect.',
                ], 422);
            }

            $user->update([
                'password' => Hash::make($validated['password']),
            ]);

            // Revoke all other tokens to force re-login
            $user->tokens()->delete();

            Log::info('Password changed successfully.', ['user_id' => $user->id]);

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'Password changed successfully. Please log in again.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Password change failed.', ['user_id' => $request->user()->id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Password change failed.',
            ], 500);
        }
    }

    /**
     * Send OTP to email for password reset.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email|exists:users,email',
            ]);

            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            // Store OTP in cache for 15 minutes
            Cache::put('password_reset_otp_' . $validated['email'], [
                'otp' => $otp,
                'expires_at' => now()->addMinutes(15),
            ], now()->addMinutes(15));

            // Send OTP via email (assumes Mailable exists)
            try {
                Mail::send('emails.password-reset-otp', ['otp' => $otp], function ($message) use ($validated) {
                    $message->to($validated['email'])
                            ->subject('Password Reset OTP - Missing Person Detection System');
                });
            } catch (\Exception $mailException) {
                Log::warning('Failed to send OTP email.', ['email' => $validated['email'], 'error' => $mailException->getMessage()]);
            }

            Log::info('Password reset OTP generated.', ['email' => $validated['email']]);

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'OTP has been sent to your email address.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Forgot password failed.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to process password reset request.',
            ], 500);
        }
    }

    /**
     * Verify OTP and reset password.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email|exists:users,email',
                'otp' => 'required|string|size:6',
                'password' => ['required', 'string', 'min:8', 'confirmed', PasswordRule::defaults()],
            ]);

            $cachedData = Cache::get('password_reset_otp_' . $validated['email']);

            if (!$cachedData) {
                return response()->json([
                    'success' => false,
                    'message' => 'OTP has expired or was not requested.',
                ], 422);
            }

            if ($cachedData['otp'] !== $validated['otp']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid OTP.',
                ], 422);
            }

            $user = User::where('email', $validated['email'])->firstOrFail();
            $user->update([
                'password' => Hash::make($validated['password']),
            ]);

            // Clear OTP from cache
            Cache::forget('password_reset_otp_' . $validated['email']);

            // Revoke all tokens
            $user->tokens()->delete();

            Log::info('Password reset successfully via OTP.', ['user_id' => $user->id]);

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'Password has been reset successfully. Please log in with your new password.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Password reset failed.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Password reset failed.',
            ], 500);
        }
    }
}

import crypto from 'crypto';

interface OTPData {
  otp: string;
  expiresAt: Date;
}

class OTPService {
  private otpStore: Map<string, OTPData> = new Map();
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly OTP_LENGTH = 6;

  /**
   * Generate a 6-digit OTP
   */
  generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Store OTP for a user (email or phone)
   */
  storeOTP(identifier: string, otp: string): void {
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
    this.otpStore.set(identifier, { otp, expiresAt });

    // Auto-cleanup after expiry
    setTimeout(() => {
      this.otpStore.delete(identifier);
    }, this.OTP_EXPIRY_MINUTES * 60 * 1000);
  }

  /**
   * Verify OTP for a user
   */
  verifyOTP(identifier: string, otp: string): boolean {
    const otpData = this.otpStore.get(identifier);

    if (!otpData) {
      return false; // OTP not found
    }

    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(identifier);
      return false; // OTP expired
    }

    if (otpData.otp !== otp) {
      return false; // OTP doesn't match
    }

    // OTP is valid, remove it from store
    this.otpStore.delete(identifier);
    return true;
  }

  /**
   * Check if OTP exists for identifier
   */
  hasOTP(identifier: string): boolean {
    const otpData = this.otpStore.get(identifier);
    if (!otpData) return false;

    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(identifier);
      return false;
    }

    return true;
  }

  /**
   * Generate password reset token
   */
  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get OTP expiry time in minutes
   */
  getExpiryMinutes(): number {
    return this.OTP_EXPIRY_MINUTES;
  }
}

export const otpService = new OTPService();

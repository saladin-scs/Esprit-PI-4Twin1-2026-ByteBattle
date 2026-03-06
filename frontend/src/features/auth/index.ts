/**
 * Feature Auth – pages et slice (barrel pour usage externe).
 */

export { default as Login } from '../../pages/Auth/Login';
export { default as Register } from '../../pages/Auth/Register';
export { default as VerifyEmail } from '../../pages/Auth/VerifyEmail';
export { default as ForgotPassword } from '../../pages/Auth/ForgotPassword';
export { default as ResetPassword } from '../../pages/Auth/ResetPassword';
export { default as SocialCallback } from '../../pages/Auth/SocialCallback';
export { default as Setup2FA } from '../../pages/Auth/Setup2FA';
export { default as authReducer, login, register, logout, fetchMe, verify2faLogin } from '../../store/slices/authSlice';
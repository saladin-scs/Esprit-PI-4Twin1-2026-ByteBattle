// pages/Auth.tsx
import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { login, faceLogin, verify2faLogin, register as registerAction } from '../../store/slices/authSlice';
import { AppDispatch } from '../../store/store';
import { motion, AnimatePresence } from 'framer-motion';
import ReCAPTCHA from 'react-google-recaptcha';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';
import * as faceapi from 'face-api.js';

// Icons
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const GithubIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// ==================== Validation Schemas ====================
const registerSchema = yup.object().shape({
  email: yup.string()
    .email('Invalid email format')
    .required('Email is required')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'),
  
  username: yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  
  password: yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  confirmPassword: yup.string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  
  firstName: yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  
  lastName: yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  
  phone: yup.string()
    .required('Phone number is required')
    .min(10, 'Please enter a valid phone number'),
  
  dateOfBirth: yup.date()
    .required('Date of birth is required')
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('age', 'You must be at least 13 years old', function(value) {
      if (!value) return false;
      const today = new Date();
      const birthDate = new Date(value);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 13;
    }),
  
  termsAccepted: yup.boolean()
    .required('You must accept the terms and conditions')
    .oneOf([true], 'You must accept the terms and conditions'),
  
  newsletter: yup.boolean().optional().default(false),
  referralSource: yup.string().optional().default(''),
});

const loginSchema = yup.object().shape({
  email: yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  password: yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
  rememberMe: yup.boolean().optional().default(true),
});

const twoFactorSchema = yup.object().shape({
  code: yup.string()
    .required('2FA code is required')
    .matches(/^\d{6}$/, 'Code must be 6 digits'),
});

type RegisterFormData = yup.InferType<typeof registerSchema>;
type LoginFormData = yup.InferType<typeof loginSchema>;
type TwoFactorFormData = yup.InferType<typeof twoFactorSchema>;

// ==================== Custom Hooks ====================

// Email availability check hook
const useEmailAvailability = (email: string, apiUrl: string) => {
  const [debouncedEmail] = useDebounce(email, 500);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkEmail = async () => {
      if (!debouncedEmail || !debouncedEmail.includes('@')) {
        setIsAvailable(null);
        return;
      }

      setIsChecking(true);
      try {
        const response = await fetch(
          `${apiUrl}/auth/check-email?email=${encodeURIComponent(debouncedEmail)}`,
        );
        const data = await response.json();
        setIsAvailable(data.available);
      } catch (error) {
        console.error('Email check failed:', error);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkEmail();
  }, [debouncedEmail, apiUrl]);

  return { isAvailable, isChecking };
};

// Face recognition hook
const useFaceRecognition = (modelsUrl: string = '/models') => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelsUrl),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelsUrl),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelsUrl),
        ]);
        setModelsLoaded(true);
        setError(null);
      } catch (err) {
        setError('Failed to load face recognition models');
        console.error('Face models loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, [modelsUrl]);

  const detectFace = async (videoElement: HTMLVideoElement) => {
    if (!modelsLoaded) {
      throw new Error('Models not loaded');
    }

    const detection = await faceapi
      .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection;
  };

  return { modelsLoaded, isLoading, error, detectFace };
};

// ==================== Components ====================

// Password strength indicator component
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getStrength(password);
  const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength - 1] || 'Very Weak';
  const strengthColor = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ][strength - 1] || 'bg-red-500';

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${strengthColor} transition-all duration-300`}
            style={{ width: `${(strength / 5) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{strengthText}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
        <div className={`flex items-center gap-1 ${password.length >= 8 ? 'text-green-500' : 'text-gray-500'}`}>
          <span>✓</span> 8+ characters
        </div>
        <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-gray-500'}`}>
          <span>✓</span> Uppercase
        </div>
        <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-green-500' : 'text-gray-500'}`}>
          <span>✓</span> Lowercase
        </div>
        <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-green-500' : 'text-gray-500'}`}>
          <span>✓</span> Number
        </div>
        <div className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(password) ? 'text-green-500' : 'text-gray-500'}`}>
          <span>✓</span> Special char
        </div>
      </div>
    </div>
  );
};

// Progress bar component
const ProgressBar = ({ currentStep, steps }: { currentStep: number; steps: { title: string }[] }) => (
  <div className="mb-8">
    <div className="flex justify-between items-center">
      {steps.map((step, index) => (
        <div key={step.title} className="flex-1 text-center">
          <div className={`
            w-8 h-8 mx-auto rounded-full flex items-center justify-center
            ${index <= currentStep 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }
          `}>
            {index + 1}
          </div>
          <div className="text-xs mt-2 text-gray-500 dark:text-gray-400">{step.title}</div>
        </div>
      ))}
    </div>
    <div className="relative mt-2">
      <div className="absolute top-0 left-0 h-1 bg-gray-300 dark:bg-gray-700 w-full rounded" />
      <div 
        className="absolute top-0 left-0 h-1 bg-blue-600 rounded transition-all duration-300"
        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
      />
    </div>
  </div>
);

// Camera component
const Camera = ({ 
  videoRef, 
  isLoading 
}: { 
  videoRef: React.RefObject<HTMLVideoElement>; 
  onFaceDetected?: () => void;
  isLoading?: boolean;
}) => {
  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-300 dark:border-gray-600"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
};

// ==================== Main Auth Component ====================

type AuthMode = 'login' | 'register' | '2fa' | 'face-login';

function Auth() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
  
  // State
  const initialMode = (localStorage.getItem('preferred_login_mode') as AuthMode) || 'login';
  const [mode, setMode] = useState<AuthMode>(['login', 'face-login'].includes(initialMode) ? initialMode : 'login');
  const [currentStep, setCurrentStep] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Hooks
  const { modelsLoaded, isLoading: faceModelsLoading, error: faceError, detectFace } = useFaceRecognition();
  
  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    if (newMode === 'login' || newMode === 'face-login') {
      localStorage.setItem('preferred_login_mode', newMode);
    }
  };

  // Forms
  const registerForm = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema) as any,
    mode: 'onChange',
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: undefined,
      termsAccepted: false,
      newsletter: false,
      referralSource: '',
    },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const twoFactorForm = useForm<TwoFactorFormData>({
    resolver: yupResolver(twoFactorSchema),
    mode: 'onChange',
    defaultValues: {
      code: '',
    },
  });

  // Watchers
  const watchRegisterEmail = registerForm.watch('email');
  const watchRegisterPassword = registerForm.watch('password');
  
  const { isAvailable: isEmailAvailable, isChecking: isCheckingEmail } = 
    useEmailAvailability(watchRegisterEmail, API_URL);

  // Registration steps
  const steps = [
    { title: 'Account', fields: ['email', 'username', 'password', 'confirmPassword'] },
    { title: 'Personal', fields: ['firstName', 'lastName', 'phone', 'dateOfBirth'] },
    { title: 'Preferences', fields: ['termsAccepted', 'newsletter', 'referralSource'] },
  ];

  // Camera management
  useEffect(() => {
    if (mode !== 'face-login') {
      stopCamera();
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await (navigator.mediaDevices?.getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia).call(navigator.mediaDevices || navigator, { video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("Camera access denied. Please allow camera permissions in your browser settings.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError("No camera found. Please connect a camera and try again.");
        } else {
          setError("Unable to access camera. Please check your browser settings or use manual login instead.");
        }
      }
    };

    startCamera();
    return () => stopCamera();
  }, [mode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Navigation
  const nextStep = async () => {
    const fieldsToValidate = steps[currentStep].fields;
    const isStepValid = await registerForm.trigger(fieldsToValidate as any);
    
    if (isStepValid) {
      if (currentStep === 0 && isEmailAvailable === false) {
        registerForm.setError('email', { 
          type: 'manual', 
          message: 'This email is already registered' 
        });
        return;
      }
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Social login
  const redirectToSocial = (provider: 'google' | 'github') => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  // ========== Handlers ==========

  // Register submission
  const onRegisterSubmit = async (data: RegisterFormData) => {
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      toast.error('Please complete the CAPTCHA verification');
      return;
    }

    if (isEmailAvailable === false) {
      toast.error('This email is already registered');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { email, username, password } = data;
      const result = await dispatch(
        registerAction({ email, username, password })
      ).unwrap();

      if (result.twoFactorSetupRequired) {
        toast.success('Account created. Please set up 2FA to continue.');
        navigate('/setup-2fa');
      } else {
        toast.success('Registration successful! Please check your email.');
        handleModeChange('login');
        registerForm.reset();
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Login submission
  const onLoginSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');

    try {
      const res = await dispatch(login(data)).unwrap();

      if (res?.twoFactorRequired && res?.twoFactorToken) {
        setTwoFactorToken(res.twoFactorToken);
        handleModeChange('2fa');
        return;
      }

      navigate('/dashboard');
      toast.success('Login successful!');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2FA verification
  const onTwoFactorSubmit = async (data: TwoFactorFormData) => {
    if (!twoFactorToken) return;

    setLoading(true);
    setError('');

    try {
      await dispatch(
        verify2faLogin({
          twoFactorToken,
          code: data.code,
          rememberMe: loginForm.getValues('rememberMe'),
        })
      ).unwrap();

      navigate('/dashboard');
      toast.success('2FA verification successful!');
    } catch (err: any) {
      setError(err.message || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Face login
  const handleFaceLogin = async () => {
    const email = loginForm.getValues('email');
    
    if (!email) {
      setError('Please enter your email before using face recognition.');
      return;
    }

    if (!modelsLoaded) {
      setError('Face recognition models are not loaded yet.');
      return;
    }

    if (!videoRef.current) {
      setError('Camera not available.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const detection = await detectFace(videoRef.current);

      if (!detection) {
        setError('No face detected. Please ensure you are facing the camera.');
        return;
      }

      const embedding = Array.from(detection.descriptor);

      await dispatch(faceLogin({
        email,
        embedding,
        rememberMe: loginForm.getValues('rememberMe'),
      })).unwrap();

      stopCamera();
      navigate('/dashboard');
      toast.success('Face recognition successful!');
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Face login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ========== Render Methods ==========

  const renderLoginForm = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            {...loginForm.register('email')}
            className={`
              w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 
              text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
              ${loginForm.formState.errors.email ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
            `}
            placeholder="you@example.com"
          />
          {loginForm.formState.errors.email && (
            <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...loginForm.register('password')}
              className={`
                w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 
                text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                ${loginForm.formState.errors.password ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
              `}
              placeholder="********"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {loginForm.formState.errors.password && (
            <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.password.message}</p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              {...loginForm.register('rememberMe')}
              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Remember me
            </label>
          </div>
          <Link to="/forgot-password" className="text-sm text-blue-500 hover:underline">
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Logging in...
            </div>
          ) : (
            'Sign In'
          )}
        </button>

        {/* Face Login Button */}
        <button
          type="button"
          onClick={() => handleModeChange('face-login')}
          className="w-full px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Login with Face Recognition
        </button>

        {/* Register Link */}
        <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => {
              handleModeChange('register');
              setCurrentStep(0);
              setError('');
            }}
            className="text-blue-500 hover:underline"
          >
            Sign up
          </button>
        </p>
      </form>
    </motion.div>
  );

  const renderRegisterForm = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
        {/* Progress Bar */}
        <ProgressBar currentStep={currentStep} steps={steps} />

        {/* Form Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: Account Info */}
            {currentStep === 0 && (
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      {...registerForm.register('email')}
                      className={`
                        w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 
                        text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                        ${registerForm.formState.errors.email ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
                      `}
                      placeholder="you@example.com"
                    />
                    {isCheckingEmail && (
                      <div className="absolute right-3 top-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>
                  {!isCheckingEmail && isEmailAvailable === false && watchRegisterEmail && (
                    <p className="text-red-500 text-xs mt-1">Email is already taken</p>
                  )}
                  {!isCheckingEmail && isEmailAvailable === true && watchRegisterEmail && (
                    <p className="text-green-500 text-xs mt-1">Email is available</p>
                  )}
                  {registerForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...registerForm.register('username')}
                    className={`
                      w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 
                      text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                      ${registerForm.formState.errors.username ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
                    `}
                    placeholder="johndoe123"
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.username.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...registerForm.register('password')}
                      className={`
                        w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 
                        text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                        ${registerForm.formState.errors.password ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
                      `}
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.password.message}</p>
                  )}
                  <PasswordStrengthIndicator password={watchRegisterPassword} />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...registerForm.register('confirmPassword')}
                      className={`
                        w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 
                        text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                        ${registerForm.formState.errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
                      `}
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Personal Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...registerForm.register('firstName')}
                    className={`
                      w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 
                      text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                      ${registerForm.formState.errors.firstName ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
                    `}
                    placeholder="John"
                  />
                  {registerForm.formState.errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.firstName.message}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...registerForm.register('lastName')}
                    className={`
                      w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 
                      text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                      ${registerForm.formState.errors.lastName ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
                    `}
                    placeholder="Doe"
                  />
                  {registerForm.formState.errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.lastName.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="phone"
                    control={registerForm.control}
                    render={({ field }) => (
                      <PhoneInput
                        country={'us'}
                        value={field.value}
                        onChange={field.onChange}
                        inputClass="!w-full !bg-gray-100 dark:!bg-gray-700 !text-gray-900 dark:!text-white !border-gray-300 dark:!border-gray-600 !rounded-lg !px-4 !py-6"
                        containerClass="!w-full"
                        buttonClass="!bg-gray-100 dark:!bg-gray-700 !border-gray-300 dark:!border-gray-600"
                      />
                    )}
                  />
                  {registerForm.formState.errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.phone.message}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="dateOfBirth"
                    control={registerForm.control}
                    render={({ field }) => (
                      <DatePicker
                        selected={field.value}
                        onChange={field.onChange}
                        maxDate={new Date()}
                        showYearDropdown
                        scrollableYearDropdown
                        yearDropdownItemNumber={100}
                        placeholderText="Select your birth date"
                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      />
                    )}
                  />
                  {registerForm.formState.errors.dateOfBirth && (
                    <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.dateOfBirth.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Preferences */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Newsletter */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...registerForm.register('newsletter')}
                    className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Subscribe to our newsletter for updates and offers
                  </label>
                </div>

                {/* Terms */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...registerForm.register('termsAccepted')}
                    className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    I accept the <a href="/terms" className="text-blue-500 hover:underline">Terms and Conditions</a> <span className="text-red-500">*</span>
                  </label>
                </div>
                {registerForm.formState.errors.termsAccepted && (
                  <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.termsAccepted.message}</p>
                )}

                {/* Referral Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    How did you hear about us?
                  </label>
                  <select
                    {...registerForm.register('referralSource')}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                  >
                    <option value="">Select an option</option>
                    <option value="social">Social Media</option>
                    <option value="friend">Friend Referral</option>
                    <option value="google">Google Search</option>
                    <option value="ad">Advertisement</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* reCAPTCHA */}
                <div className="mt-4">
                  {RECAPTCHA_SITE_KEY ? (
                    <ReCAPTCHA
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={setCaptchaToken}
                    />
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      reCAPTCHA is disabled in this environment.
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Previous
            </button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ml-auto"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || (Boolean(RECAPTCHA_SITE_KEY) && !captchaToken)}
              className={`
                px-6 py-2 bg-blue-600 text-white rounded-lg transition-colors ml-auto
                ${loading || (Boolean(RECAPTCHA_SITE_KEY) && !captchaToken)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-700'
                }
              `}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          )}
        </div>

        {/* Login Link */}
        <p className="text-center text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => {
              handleModeChange('login');
              setError('');
            }}
            className="text-blue-500 hover:underline"
          >
            Sign in
          </button>
        </p>
      </form>
    </motion.div>
  );

  const renderTwoFactorForm = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={twoFactorForm.handleSubmit(onTwoFactorSubmit)} className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
          Please enter the 6-digit code from your authenticator app.
        </p>

        {/* 2FA Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Authentication Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...twoFactorForm.register('code')}
            maxLength={6}
            className={`
              w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 
              text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-center text-xl tracking-widest
              ${twoFactorForm.formState.errors.code ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
            `}
            placeholder="000000"
          />
          {twoFactorForm.formState.errors.code && (
            <p className="text-red-500 text-xs mt-1">{twoFactorForm.formState.errors.code.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Verifying...
            </div>
          ) : (
            'Verify'
          )}
        </button>

        {/* Back to Login */}
        <button
          type="button"
          onClick={() => {
            handleModeChange('login');
            setTwoFactorToken(null);
            setError('');
          }}
          className="w-full text-sm text-blue-500 hover:underline"
        >
          Back to login
        </button>
      </form>
    </motion.div>
  );

  const renderFaceLoginForm = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Email Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          {...loginForm.register('email')}
          className={`w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 ${loginForm.formState.errors.email ? 'border-red-500' : ''}`}
          placeholder="you@example.com"
        />
        {loginForm.formState.errors.email && (
          <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.email.message}</p>
        )}
      </div>

      {/* Camera */}
      {faceModelsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Loading face recognition models...</p>
        </div>
      ) : (
        <>
          <Camera videoRef={videoRef} isLoading={loading} />
          
          <button
            type="button"
            onClick={handleFaceLogin}
            disabled={loading || !modelsLoaded}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Verifying Face...
              </div>
            ) : (
              'Verify Face'
            )}
          </button>
        </>
      )}

      {/* Back to Login */}
      <button
        type="button"
        onClick={() => {
          handleModeChange('login');
          stopCamera();
          setError('');
        }}
        className="w-full text-sm text-blue-500 hover:underline"
      >
        Back to login
      </button>
    </motion.div>
  );

  // ========== Main Render ==========
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-200 dark:border-transparent">
          {/* Header */}
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            {mode === 'login' && 'Sign In to Your Account'}
            {mode === 'register' && 'Create Your Account'}
            {mode === '2fa' && 'Two-Factor Authentication'}
            {mode === 'face-login' && 'Face Recognition Login'}
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {/* Face Error */}
          {faceError && mode === 'face-login' && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 rounded-lg">
              {faceError}
            </div>
          )}

          {/* Forms Container */}
          <AnimatePresence mode="wait">
            {mode === 'login' && renderLoginForm()}
            {mode === 'register' && renderRegisterForm()}
            {mode === '2fa' && renderTwoFactorForm()}
            {mode === 'face-login' && renderFaceLoginForm()}
          </AnimatePresence>

          {/* Social Login - Only show on login mode */}
          {mode === 'login' && (
            <div className="mt-6 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => redirectToSocial('google')}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 dark:bg-gray-100 dark:hover:bg-gray-200 text-gray-800 dark:text-gray-900 py-2.5 rounded-lg font-semibold border border-gray-300 dark:border-gray-400 transition-colors"
              >
                <GoogleIcon />
                Google
              </button>
              
              <button
                type="button"
                onClick={() => redirectToSocial('github')}
                className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white py-2.5 rounded-lg font-semibold border border-gray-600 dark:border-gray-500 transition-colors"
              >
                <GithubIcon />
                GitHub
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { register as registerAction } from '../../store/slices/authSlice';
import { AppDispatch } from '../../store/store';
import { motion, AnimatePresence } from 'framer-motion';
import ReCAPTCHA from 'react-google-recaptcha';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';
import { GoogleIcon, GithubIcon } from '../../components/icons/SocialAuthIcons';

// Validation schema
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

type RegisterFormData = yup.InferType<typeof registerSchema>;

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
          `${apiUrl}/auth/check-email?email=${encodeURIComponent(
            debouncedEmail,
          )}`,
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
  }, [debouncedEmail]);

  return { isAvailable, isChecking };
};

function Register() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as
    | string
    | undefined;
  const [currentStep, setCurrentStep] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    trigger,
    setError,
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema) as any, // Type assertion to fix resolver type issue
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

  const watchEmail = watch('email');
  const watchPassword = watch('password');
  const { isAvailable: isEmailAvailable, isChecking: isCheckingEmail } =
    useEmailAvailability(watchEmail, API_URL);

  const steps = [
    { title: 'Account', fields: ['email', 'username', 'password', 'confirmPassword'] },
    { title: 'Personal', fields: ['firstName', 'lastName', 'phone', 'dateOfBirth'] },
    { title: 'Preferences', fields: ['termsAccepted', 'newsletter', 'referralSource'] },
  ];

  const nextStep = async () => {
    const fieldsToValidate = steps[currentStep].fields;
    const isStepValid = await trigger(fieldsToValidate as any);
    
    if (isStepValid) {
      if (currentStep === 0 && isEmailAvailable === false) {
        setError('email', { 
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

  const onSubmit = async (data: RegisterFormData) => {
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      toast.error('Please complete the CAPTCHA verification');
      return;
    }

    if (isEmailAvailable === false) {
      toast.error('This email is already registered');
      return;
    }

    try {
      const { email, username, password } = data;
      const result = await dispatch(
        registerAction({
          email,
          username,
          password,
        }),
      ).unwrap();

      if (result.twoFactorSetupRequired) {
        toast.success('Compte créé. Configurez la 2FA pour continuer.');
        navigate('/setup-2fa');
      } else {
        toast.success('Inscription réussie. Vérifiez votre email.');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err?.message || "Échec de l'inscription.");
    }
  };

  const redirectToSocial = (provider: 'google' | 'github') => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  // Helper function to register fields without conflicting with Redux
  const registerField = (name: keyof RegisterFormData) => {
    return register(name);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
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

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-200 dark:border-transparent">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create Your Account</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                          {...registerField('email')}
                          className={`
                            w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                            ${errors.email 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'focus:ring-blue-500'
                            }
                          `}
                          placeholder="you@example.com"
                        />
                        {isCheckingEmail && (
                          <div className="absolute right-3 top-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                          </div>
                        )}
                        {!isCheckingEmail && isEmailAvailable === false && (
                          <p className="text-red-500 text-xs mt-1">Email is already taken</p>
                        )}
                        {!isCheckingEmail && isEmailAvailable === true && watchEmail && (
                          <p className="text-green-500 text-xs mt-1">Email is available</p>
                        )}
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...registerField('username')}
                        className={`
                          w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                          ${errors.username ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
                        `}
                        placeholder="johndoe123"
                      />
                      {errors.username && (
                        <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
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
                          {...registerField('password')}
                          className={`
                            w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                            ${errors.password ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
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
                      {errors.password && (
                        <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                      )}
                      <PasswordStrengthIndicator password={watchPassword} />
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...registerField('confirmPassword')}
                          className={`
                            w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                            ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
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
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
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
                        {...registerField('firstName')}
                        className={`
                          w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                          ${errors.firstName ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
                        `}
                        placeholder="John"
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...registerField('lastName')}
                        className={`
                          w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600
                          ${errors.lastName ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
                        `}
                        placeholder="Doe"
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name="phone"
                        control={control}
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
                      {errors.phone && (
                        <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                      )}
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name="dateOfBirth"
                        control={control}
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
                      {errors.dateOfBirth && (
                        <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth.message}</p>
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
                        {...registerField('newsletter')}
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
                        {...registerField('termsAccepted')}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-600 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        I accept the <a href="/terms" className="text-blue-500 hover:underline">Terms and Conditions</a> <span className="text-red-500">*</span>
                      </label>
                    </div>
                    {errors.termsAccepted && (
                      <p className="text-red-500 text-xs mt-1">{errors.termsAccepted.message}</p>
                    )}

                    {/* Referral Source */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        How did you hear about us?
                      </label>
                      <select
                        {...registerField('referralSource')}
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
                  disabled={
                    isSubmitting ||
                    (Boolean(RECAPTCHA_SITE_KEY) && !captchaToken)
                  }
                  className={`
                    px-6 py-2 bg-blue-600 text-white rounded-lg transition-colors ml-auto
                    ${isSubmitting || (Boolean(RECAPTCHA_SITE_KEY) && !captchaToken)
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-blue-700'
                    }
                  `}
                >
                  {isSubmitting ? (
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
          </form>

          {/* Login Link */}
          <p className="text-center text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-blue-500 hover:underline">
              Sign in
            </a>
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => redirectToSocial('google')}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 dark:bg-gray-100 dark:hover:bg-gray-200 text-gray-800 dark:text-gray-900 py-2.5 rounded-lg font-semibold border border-gray-300 dark:border-gray-400 transition-colors"
            >
              <GoogleIcon className="w-5 h-5 shrink-0" />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => redirectToSocial('github')}
              className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white py-2.5 rounded-lg font-semibold border border-gray-600 dark:border-gray-500 transition-colors"
            >
              <GithubIcon className="w-5 h-5 shrink-0" />
              Continue with GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
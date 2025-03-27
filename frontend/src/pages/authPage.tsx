import React, { useState, useEffect, JSX } from "react";
import { Eye, EyeOff, Mail, Lock, User, Info, AlertCircle } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Form from "@radix-ui/react-form";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Toast from "@radix-ui/react-toast";
import { useAuth } from "@/hooks/useAuth";

/**
 * Password strength criteria types
 */
type PasswordStrength = "weak" | "medium" | "strong" | "none";

/**
 * Component for displaying password requirements tooltip
 */
const PasswordRequirements: React.FC = () => (
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
          aria-label="Password requirements"
        >
          <Info size={16} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="bg-white p-3 rounded-md shadow-lg border border-gray-200 max-w-xs z-50"
          sideOffset={5}
        >
          <div className="text-xs text-gray-700">
            <p className="font-medium mb-1">Password must contain:</p>
            <ul className="list-disc list-inside">
              <li>At least 8 characters</li>
              <li>At least one uppercase letter</li>
              <li>At least one lowercase letter</li>
              <li>At least one number</li>
              <li>At least one special character</li>
            </ul>
          </div>
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

/**
 * Calculate password strength based on criteria
 * @param password - The password to evaluate
 * @returns Password strength rating
 */
const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) return "none";

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=[]{};':"\\|,.<>\/?]/.test(password);

  const score = [hasMinLength, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(Boolean).length;

  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
};

/**
 * Component for password strength indicator
 */
const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
  const strength = calculatePasswordStrength(password);

  const getColorClass = () => {
    switch (strength) {
      case "weak":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "strong":
        return "bg-green-500";
      default:
        return "bg-gray-200";
    }
  };

  const getWidthClass = () => {
    switch (strength) {
      case "weak":
        return "w-1/3";
      case "medium":
        return "w-2/3";
      case "strong":
        return "w-full";
      default:
        return "w-0";
    }
  };

  /**
   * Get text color class based on password strength
   */
  const getTextColorClass = (): string => {
    switch (strength) {
      case "weak":
        return "text-red-500";
      case "medium":
        return "text-yellow-600";
      case "strong":
        return "text-green-600";
      default:
        return "text-gray-500";
    }
  };

  /**
   * Get password strength descriptive message
   */
  const getStrengthMessage = (): string => {
    switch (strength) {
      case "weak":
        return "Weak password";
      case "medium":
        return "Medium password";
      case "strong":
        return "Strong password";
      default:
        return "";
    }
  };

  if (!password) return null;

  return (
    <div className="mt-1">
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${getWidthClass()} ${getColorClass()} transition-all duration-300`}></div>
      </div>
      <p className={`text-xs mt-1 ${getTextColorClass()}`}>{getStrengthMessage()}</p>
    </div>
  );
};

/**
 * Password input component with show/hide toggle
 */
const PasswordInput: React.FC<{
  showPassword: boolean;
  toggleShowPassword: () => void;
  formPassword: string;
  setFormPassword: (value: string) => void;
  minLength?: number;
  showStrengthIndicator?: boolean;
}> = ({
  showPassword,
  toggleShowPassword,
  formPassword,
  setFormPassword,
  minLength = 0,
  showStrengthIndicator = false,
}) => {
  return (
    <Form.Field name="password" className="space-y-2">
      <div className="flex items-center justify-between">
        <Form.Label className="block text-sm font-medium text-gray-700">Password</Form.Label>
        {showStrengthIndicator && <PasswordRequirements />}
      </div>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
          <Lock size={18} aria-hidden="true" />
        </span>
        <Form.Control asChild>
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={minLength}
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="••••••••"
            value={formPassword}
            onChange={e => setFormPassword(e.target.value)}
            aria-invalid="false"
          />
        </Form.Control>
        <button
          type="button"
          onClick={toggleShowPassword}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {showStrengthIndicator && <PasswordStrengthIndicator password={formPassword} />}
      <Form.Message match="valueMissing" className="text-sm text-red-600">
        Please enter a password
      </Form.Message>
      {minLength > 0 && (
        <Form.Message match="tooShort" className="text-sm text-red-600">
          Password must be at least {minLength} characters
        </Form.Message>
      )}
    </Form.Field>
  );
};

/**
 * Login form component
 */
const LoginForm: React.FC<{
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  showPassword: boolean;
  toggleShowPassword: () => void;
}> = ({ onSubmit, isLoading, showPassword, toggleShowPassword }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Form.Root onSubmit={onSubmit} className="space-y-4">
      <Form.Field name="email" className="space-y-2">
        <Form.Label className="block text-sm font-medium text-gray-700">Email</Form.Label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <Mail size={18} aria-hidden="true" />
          </span>
          <Form.Control asChild>
            <input
              type="email"
              required
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-invalid="false"
            />
          </Form.Control>
        </div>
        <Form.Message match="valueMissing" className="text-sm text-red-600">
          Please enter your email
        </Form.Message>
        <Form.Message match="typeMismatch" className="text-sm text-red-600">
          Please enter a valid email
        </Form.Message>
      </Form.Field>

      <PasswordInput
        showPassword={showPassword}
        toggleShowPassword={toggleShowPassword}
        formPassword={password}
        setFormPassword={setPassword}
      />

      <div className="flex justify-end">
        <button
          type="button"
          className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
        >
          Forgot password?
        </button>
      </div>

      <Form.Submit asChild>
        <button
          className="w-full rounded-md bg-blue-600 py-2 px-4 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </Form.Submit>
    </Form.Root>
  );
};

/**
 * Registration form component
 */
const RegisterForm: React.FC<{
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  showPassword: boolean;
  toggleShowPassword: () => void;
}> = ({ onSubmit, isLoading, showPassword, toggleShowPassword }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Form.Root onSubmit={onSubmit} className="space-y-4">
      <Form.Field name="name" className="space-y-2">
        <Form.Label className="block text-sm font-medium text-gray-700">Full Name</Form.Label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <User size={18} aria-hidden="true" />
          </span>
          <Form.Control asChild>
            <input
              type="text"
              required
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              aria-invalid="false"
            />
          </Form.Control>
        </div>
        <Form.Message match="valueMissing" className="text-sm text-red-600">
          Please enter your name
        </Form.Message>
      </Form.Field>

      <Form.Field name="email" className="space-y-2">
        <Form.Label className="block text-sm font-medium text-gray-700">Email</Form.Label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <Mail size={18} aria-hidden="true" />
          </span>
          <Form.Control asChild>
            <input
              type="email"
              required
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-invalid="false"
            />
          </Form.Control>
        </div>
        <Form.Message match="valueMissing" className="text-sm text-red-600">
          Please enter your email
        </Form.Message>
        <Form.Message match="typeMismatch" className="text-sm text-red-600">
          Please enter a valid email
        </Form.Message>
      </Form.Field>

      <PasswordInput
        showPassword={showPassword}
        toggleShowPassword={toggleShowPassword}
        formPassword={password}
        setFormPassword={setPassword}
        minLength={8}
        showStrengthIndicator={true}
      />

      <Form.Submit asChild>
        <button
          className="w-full rounded-md bg-blue-600 py-2 px-4 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </button>
      </Form.Submit>
    </Form.Root>
  );
};

/**
 * Main Authentication Page Component
 * Handles user login and registration
 */
export default function AuthPage(): JSX.Element {
  // State for showing/hiding password
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Auth hook for authentication operations
  const { login, register, isLoading, error, clearError } = useAuth();

  // Active tab state (login or register)
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Toast notification state
  const [toastOpen, setToastOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");

  // Clear error when switching tabs
  useEffect(() => {
    if (error) clearError();
  }, [activeTab, clearError, error]);

  // Show toast notification when error occurs
  useEffect(() => {
    if (error) {
      setToastMessage(error);
      setToastOpen(true);
    }
  }, [error]);

  // Toggle password visibility
  const toggleShowPassword = (): void => {
    setShowPassword(!showPassword);
  };

  /**
   * Handle login form submission
   * @param event - Form event
   */
  const handleLogin = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    login(email, password);
  };

  /**
   * Handle registration form submission
   * @param event - Form event
   */
  const handleRegister = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    register(name, email, password);
  };

  return (
    <Tooltip.Provider>
      <Toast.Provider swipeDirection="right">
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            <Tabs.Root
              defaultValue="login"
              value={activeTab}
              onValueChange={value => setActiveTab(value as "login" | "register")}
              className="w-full"
            >
              <Tabs.List className="flex border-b" aria-label="Authenticate with your account">
                <Tabs.Trigger
                  value="login"
                  className="flex-1 p-4 text-center font-medium hover:bg-gray-100 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors"
                >
                  Login
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="register"
                  className="flex-1 p-4 text-center font-medium hover:bg-gray-100 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors"
                >
                  Register
                </Tabs.Trigger>
              </Tabs.List>

              {error && (
                <div
                  className="flex items-center gap-2 bg-red-50 p-3 text-red-600 text-sm"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <Tabs.Content value="login" className="p-6 focus:outline-none" tabIndex={0}>
                <LoginForm
                  onSubmit={handleLogin}
                  isLoading={isLoading}
                  showPassword={showPassword}
                  toggleShowPassword={toggleShowPassword}
                />
              </Tabs.Content>

              <Tabs.Content value="register" className="p-6 focus:outline-none" tabIndex={0}>
                <RegisterForm
                  onSubmit={handleRegister}
                  isLoading={isLoading}
                  showPassword={showPassword}
                  toggleShowPassword={toggleShowPassword}
                />
              </Tabs.Content>
            </Tabs.Root>
          </div>

          {/* Toast notification for errors */}
          <Toast.Root
            className="bg-white rounded-md shadow-lg border border-gray-200 p-4 grid grid-cols-[auto_max-content] gap-x-4 items-center fixed bottom-4 right-4 data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut"
            open={toastOpen}
            onOpenChange={setToastOpen}
          >
            <Toast.Title className="flex items-center gap-2 text-red-600 font-medium">
              <AlertCircle size={16} />
              Error
            </Toast.Title>
            <Toast.Description className="text-gray-700 mt-1">{toastMessage}</Toast.Description>
            <Toast.Action className="grid" asChild altText="Close toast">
              <button
                className="absolute top-2 right-2 inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close"
              >
                &times;
              </button>
            </Toast.Action>
          </Toast.Root>
          <Toast.Viewport className="fixed bottom-0 right-0 p-6 flex flex-col gap-2 w-96 max-w-[100vw] m-0 list-none z-50" />
        </div>
      </Toast.Provider>
    </Tooltip.Provider>
  );
}

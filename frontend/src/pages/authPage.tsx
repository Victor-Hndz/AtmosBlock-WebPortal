import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Form from "@radix-ui/react-form";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, isLoading, error, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Clear error when switching tabs
  useEffect(() => {
    if (error) clearError();
  }, [activeTab, clearError, error]);

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    login(email, password);
  };

  const handleRegister = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    register(name, email, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
        <Tabs.Root
          defaultValue="login"
          value={activeTab}
          onValueChange={value => setActiveTab(value as "login" | "register")}
          className="w-full"
        >
          <Tabs.List className="flex border-b">
            <Tabs.Trigger
              value="login"
              className="flex-1 p-4 text-center font-medium hover:bg-gray-100 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              Login
            </Tabs.Trigger>
            <Tabs.Trigger
              value="register"
              className="flex-1 p-4 text-center font-medium hover:bg-gray-100 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              Register
            </Tabs.Trigger>
          </Tabs.List>

          {error && (
            <div className="bg-red-50 p-3 text-center text-red-600 text-sm" role="alert">
              {error}
            </div>
          )}

          <Tabs.Content value="login" className="p-6">
            <Form.Root onSubmit={handleLogin} className="space-y-4">
              <Form.Field name="email" className="space-y-2">
                <Form.Label className="block text-sm font-medium text-gray-700">Email</Form.Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <Mail size={18} />
                  </span>
                  <Form.Control asChild>
                    <input
                      type="email"
                      required
                      className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="you@example.com"
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

              <Form.Field name="password" className="space-y-2">
                <Form.Label className="block text-sm font-medium text-gray-700">Password</Form.Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <Lock size={18} />
                  </span>
                  <Form.Control asChild>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                  </Form.Control>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Form.Message match="valueMissing" className="text-sm text-red-600">
                  Please enter your password
                </Form.Message>
              </Form.Field>

              <Form.Submit asChild>
                <button
                  className="w-full rounded-md bg-blue-600 py-2 px-4 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </button>
              </Form.Submit>
            </Form.Root>
          </Tabs.Content>

          <Tabs.Content value="register" className="p-6">
            <Form.Root onSubmit={handleRegister} className="space-y-4">
              <Form.Field name="name" className="space-y-2">
                <Form.Label className="block text-sm font-medium text-gray-700">Full Name</Form.Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <User size={18} />
                  </span>
                  <Form.Control asChild>
                    <input
                      type="text"
                      required
                      className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="John Doe"
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
                    <Mail size={18} />
                  </span>
                  <Form.Control asChild>
                    <input
                      type="email"
                      required
                      className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="you@example.com"
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

              <Form.Field name="password" className="space-y-2">
                <Form.Label className="block text-sm font-medium text-gray-700">Password</Form.Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <Lock size={18} />
                  </span>
                  <Form.Control asChild>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                  </Form.Control>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Form.Message match="valueMissing" className="text-sm text-red-600">
                  Please enter a password
                </Form.Message>
                <Form.Message match="tooShort" className="text-sm text-red-600">
                  Password must be at least 8 characters
                </Form.Message>
              </Form.Field>

              <Form.Submit asChild>
                <button
                  className="w-full rounded-md bg-blue-600 py-2 px-4 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </button>
              </Form.Submit>
            </Form.Root>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}

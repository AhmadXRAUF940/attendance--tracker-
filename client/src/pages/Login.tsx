import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@shared/routes";
import { useLogin } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { School, Loader2, User, Lock } from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = api.auth.login.input;

export default function Login() {
  const { mutate: login, isPending, error } = useLogin();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      institutionId: "",
      password: "",
    },
  });

  function onSubmit(data: z.infer<typeof loginSchema>) {
    login(data);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Left Side - Brand */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/95 to-primary/90"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-secondary">
            <School className="h-8 w-8" />
            <span className="font-display font-bold text-2xl">Rise & Shine High School</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="font-display text-5xl font-bold mb-6 leading-tight">
            Excellence in <br/>
            <span className="text-secondary">Education</span> & <br/>
            Character.
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Welcome to the digital attendance portal. Secure, efficient, and transparent tracking for students and faculty.
          </p>
        </div>

        <div className="relative z-10 text-sm text-slate-500">
          © 2024 Rise & Shine High School. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <div className="inline-flex lg:hidden items-center gap-2 text-primary mb-6 justify-center">
              <School className="h-8 w-8" />
              <span className="font-display font-bold text-xl">Rise & Shine</span>
            </div>
            <h2 className="text-3xl font-display font-bold text-slate-900">Welcome Back</h2>
            <p className="mt-2 text-slate-600">Please sign in with your institution ID.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200 border border-slate-100">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {error && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    {error.message}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="institutionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Institution ID</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="TCH-1001 or STD-2005" 
                            {...field} 
                            className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <div className="text-center text-sm text-slate-500">
            <p>Forgot your credentials? Contact the administration office.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

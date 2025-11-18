"use client"
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const router = useRouter();

    const handleLogin = (e) => {
        e.preventDefault();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError('Wrong Email Address');
            return;
        }

        setEmailError('');
        console.log('Login attempted');
        
        router.push('/dashboard/my_tasks');
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Left Panel - Welcome Section */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative bg-[#E8EEF3] p-8 items-center justify-center">
                <div className="absolute top-10 left-10 w-16 h-16 opacity-30">
                    <svg viewBox="0 0 100 100" className="text-gray-300">
                        <path d="M50 0 L54 46 L100 50 L54 54 L50 100 L46 54 L0 50 L46 46 Z" fill="currentColor" />
                    </svg>
                </div>
                <div className="absolute bottom-20 right-20 w-12 h-12 opacity-30">
                    <svg viewBox="0 0 100 100" className="text-gray-300">
                        <path d="M50 0 L54 46 L100 50 L54 54 L50 100 L46 54 L0 50 L46 46 Z" fill="currentColor" />
                    </svg>
                </div>
                <div className="absolute top-1/3 left-20 w-10 h-10 opacity-20">
                    <svg viewBox="0 0 100 100" className="text-gray-300">
                        <path d="M50 0 L54 46 L100 50 L54 54 L50 100 L46 54 L0 50 L46 46 Z" fill="currentColor" />
                    </svg>
                </div>
                <div className="absolute bottom-1/3 right-32 w-8 h-8 opacity-20">
                    <svg viewBox="0 0 100 100" className="text-gray-300">
                        <path d="M50 0 L54 46 L100 50 L54 54 L50 100 L46 54 L0 50 L46 46 Z" fill="currentColor" />
                    </svg>
                </div>

                <div className="max-w-xl z-10 text-center space-y-6">
                    <div className="flex justify-center mb-6">
                        <Image src="/logo.svg" alt="GLS Logo" width={100} height={100} />
                    </div>

                    <h1 className="text-4xl font-bold text-[#1E3A5F]">
                        Welcome to GLS Workflow Portal
                    </h1>
                    <p className="text-lg text-[#5A6C7D]">
                        Your Central Hub for Job Tracking, Video Uploads, and Digital Paperwork.
                    </p>

                    {/* Main Image with rounded top - larger and touching bottom */}
                    <div className="relative mt-8 mx-auto w-full max-w-lg">
                        <div className="relative rounded-t-[220px] overflow-hidden shadow-2xl" style={{ height: '600px' }}>
                            <img src="/courtroom.png" alt="Courtroom" className="w-full h-full object-cover" />
                        </div>

                        {/* Floating laptop image - top left */}
                        <div className="absolute -left-20 top-60 w-36 h-28 bg-white rounded-xl shadow-2xl overflow-hidden transform ">
                            <img src="/laptop.png" alt="Laptop" className="w-full h-full object-cover" />
                        </div>

                        {/* Floating camera image - bottom right */}
                        <div className="absolute -right-20 bottom-40 w-44 h-36 bg-white rounded-xl shadow-2xl overflow-hidden transform ">
                            <img src="/camera.png" alt="Camera" className="w-full h-full object-cover" />
                        </div>
                    </div>


                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex w-full lg:w-1/2 xl:w-2/5 items-center justify-center p-6 sm:p-12 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="lg:hidden flex justify-center mb-6">
                        <Image src="/logo.svg" alt="GLS Logo" width={100} height={100} />
                    </div>

                    {/* Login Header */}
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-[#1E3A5F]">
                            Login to Continue
                        </h2>
                        <p className="mt-2 text-[#5A6C7D]">
                            Welcome back! Please enter your details.
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="mt-8 space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[#1E3A5F] mb-2">
                                Email <span className="text-red-600">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setEmailError('');
                                    }}
                                    className={`block w-full pl-12 pr-4 py-3 border ${emailError ? 'border-red-500' : 'border-gray-300'
                                        } rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400`}
                                    placeholder="example@email.com"
                                />
                            </div>
                            {emailError && (
                                <div className="mt-2">
                                    <span className="inline-block bg-red-500 text-white text-xs px-3 py-1 rounded">
                                        {emailError}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[#1E3A5F] mb-2">
                                Password <span className="text-red-600">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            className="w-full bg-[#8B1538] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#6D1028] focus:outline-none focus:ring-2 focus:ring-[#8B1538] focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}


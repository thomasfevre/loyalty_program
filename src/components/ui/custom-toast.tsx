"use client";

import { toast as hotToast, Toast, ToastPosition } from "react-hot-toast";
import { ReactNode } from "react";

type ToastVariant = "success" | "error" | "info" | "warning";

interface CustomToastProps {
  message: string | ReactNode;
  variant?: ToastVariant;
  duration?: number;
  position?: ToastPosition;
}

// Custom toast renderer that adds styling
const renderToast = ({ message, variant = "info" }: CustomToastProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          bgClass: "bg-gradient-to-r from-green-500/90 to-emerald-600/90",
          iconClass: "text-green-200",
          icon: "✓",
          borderClass: "border-green-400/30",
        };
      case "error":
        return {
          bgClass: "bg-gradient-to-r from-red-500/90 to-red-600/90",
          iconClass: "text-red-200",
          icon: "✕",
          borderClass: "border-red-400/30",
        };
      case "warning":
        return {
          bgClass: "bg-gradient-to-r from-amber-500/90 to-amber-600/90",
          iconClass: "text-amber-200",
          icon: "⚠",
          borderClass: "border-amber-400/30",
        };
      default:
        return {
          bgClass: "bg-gradient-to-r from-indigo-500/90 to-purple-600/90",
          iconClass: "text-indigo-200",
          icon: "ℹ",
          borderClass: "border-indigo-400/30",
        };
    }
  };

  const { bgClass, iconClass, icon, borderClass } = getVariantStyles();

  return (
    <div
      className={`flex items-center p-4 rounded-lg shadow-lg ${bgClass} border ${borderClass} text-white max-w-md`}
    >
      <div
        className={`flex justify-center items-center w-8 h-8 rounded-full bg-white/20 mr-3 ${iconClass}`}
      >
        {icon}
      </div>
      <div className="flex-1">{message}</div>
    </div>
  );
};

// Toast functions using our custom styling
export const toast = {
  success: (message: string | ReactNode, options?: Omit<CustomToastProps, "message" | "variant">) => {
    return hotToast.custom(
      (t) => renderToast({ message, variant: "success", ...options }),
      {
        duration: options?.duration || 4000,
        position: options?.position || "bottom-right",
      }
    );
  },
  error: (message: string | ReactNode, options?: Omit<CustomToastProps, "message" | "variant">) => {
    return hotToast.custom(
      (t) => renderToast({ message, variant: "error", ...options }),
      {
        duration: options?.duration || 4000,
        position: options?.position || "bottom-right",
      }
    );
  },
  info: (message: string | ReactNode, options?: Omit<CustomToastProps, "message" | "variant">) => {
    return hotToast.custom(
      (t) => renderToast({ message, variant: "info", ...options }),
      {
        duration: options?.duration || 4000,
        position: options?.position || "bottom-right",
      }
    );
  },
  warning: (message: string | ReactNode, options?: Omit<CustomToastProps, "message" | "variant">) => {
    return hotToast.custom(
      (t) => renderToast({ message, variant: "warning", ...options }),
      {
        duration: options?.duration || 4000,
        position: options?.position || "bottom-right",
      }
    );
  },
};

// Custom Toast Container Component
export function CustomToaster() {
  return hotToast.custom(() => <></>);
} 
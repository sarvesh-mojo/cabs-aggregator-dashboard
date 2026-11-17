import React, { useState, ChangeEvent, FormEvent } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { saveLoginInfo } from "../../Redux/slices/authSlice"; // Redux slice for login info
import { LoginAPI } from "../../config/auth/auth_apicall"; // API call for login
import { EyeCloseIcon, EyeIcon } from "../../icons"; // Your icons
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import {
  SaveActivePartner,
  SaveDateRange,
  SaveReportActivePartner,
} from "../../Redux/slices/operationSlice";
import { navItems } from "../../layout/AppSidebar";
import {
  SWIGGY_OPS_BAC_PARTNER,
  YATRA_OPS_BAC_PARTNER,
  isSwiggyOpsUser,
  isYatraOpsUser,
  resolveLockedCabPartners,
} from "../../utils/partnerAccess";
import AppVersion from "../common/AppVersion";

// Type for form data
interface FormData {
  username: string;
  password: string;
}

// Type for form errors
interface FormErrors {
  username?: string;
  password?: string;
}

// Type for alert message
interface Alert {
  type: "success" | "error" | "";
  message: string;
}

const SignInForm: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [alert, setAlert] = useState<Alert>({ type: "", message: "" });

  // Handle input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setAlert({ type: "", message: "" }); // Clear alert on change
  };

  // Validate form inputs
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.username.trim()) newErrors.username = "Username is required.";
    if (!formData.password.trim()) newErrors.password = "Password is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const loginResp: any = await LoginAPI(formData);

      if (loginResp?.status === 200 && loginResp?.success === true) {
        dispatch(saveLoginInfo({ ...loginResp, username: formData.username.trim() })); // Save login info in Redux
        if (loginResp?.partner[0] == "") {
          setAlert({
            type: "error",
            message: "No listed Partner found , on this account",
          });
          return;
        }

        const isAggregatorLogin = loginResp?.backend === "aggregator";
        const isSwiggyOpsLogin = isSwiggyOpsUser(formData.username);
        const isYatraOpsLogin = isYatraOpsUser(formData.username);
        const lockedCabPartners = resolveLockedCabPartners(
          loginResp?.partner,
          loginResp?.cabPartner,
        );
        const platformPartners = (loginResp?.partner || []).filter(
          (partnerName: string) =>
            !lockedCabPartners.some(
              (cabPartner) =>
                cabPartner.toLowerCase() === String(partnerName).toLowerCase(),
            ),
        );
        let initialReportPartner = platformPartners[0] || "indigo";
        if (isSwiggyOpsLogin && loginResp?.partner?.includes("bac")) {
          initialReportPartner = SWIGGY_OPS_BAC_PARTNER;
        } else if (isYatraOpsLogin && loginResp?.partner?.includes("bac")) {
          initialReportPartner = YATRA_OPS_BAC_PARTNER;
        }

        dispatch(SaveReportActivePartner(initialReportPartner));
        if (isAggregatorLogin) {
          dispatch(SaveActivePartner("aggregator"));
        } else if (platformPartners.length > 1) {
          dispatch(SaveActivePartner("all"));
        } else {
          dispatch(SaveActivePartner(platformPartners[0] || "indigo"));
        }
        setAlert({
          type: "success",
          message: "Login successful! Redirecting to dashboard...",
        });
        sessionStorage.setItem("userName", formData.username);

        function findMenuItemById(menu: any[], id: string) {
          for (const item of menu) {
            if (item.id === id) return item;
            if (item.subItems) {
              const subItem = item.subItems.find((sub: any) => sub.id === id);
              if (subItem) return subItem;
            }
          }
          return "";
        }

        //Initialize date range with today - onload*****************
        const today = new Date().toISOString().slice(0, 10);
        dispatch(SaveDateRange([today, today]));

        if (isAggregatorLogin) {
          setTimeout(() => navigate("/dashboard/aggregator/overview"), 800);
          return;
        }

        let initialPartner = loginResp?.partner[0];
        if (loginResp.data[0]?.[initialPartner]?.user_rights) {
          let userRights =
            loginResp.data[0][initialPartner].user_rights?.split(",") || [];
          const LandingPageId = userRights.length > 0 ? userRights[0] : "1.0";
          const landingPage: any = findMenuItemById(navItems, LandingPageId);
          if (landingPage) {
            setTimeout(() => navigate(landingPage.path), 1000);
          } else {
            setTimeout(() => navigate("/dashboard"), 1000);
          }
        }
      } else {
        setAlert({
          type: "error",
          message: "Invalid credentials. Please try again.",
        });
      }
    } catch (error) {
      console.error("Login Error:", error);
      setAlert({
        type: "error",
        message: "Login failed! Please check your credentials.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <h1 className="text-title-sm font-semibold dark:text-white/90">
          VIA VIP Aggregator Control
        </h1>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-3 sm:mb-5">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Sign In
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter your username and password to sign in!
          </p>
        </div>

        
        {/* Alert Message */}
        {alert.message && (
          <div
            className={`alert ${
              alert.type === "success"
                ? "alert-success bg-gradient-success text-success-500"
                : "alert-danger bg-gradient-danger text-error-500"
            } py-2  fw-bold rounded`}
          >
            {alert.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Email Input */}
            <div>
              <Label>
                Username <span className="text-error-500">*</span>{" "}
              </Label>
              <Input
                name="username"
                value={formData.username}
                placeholder="Enter username"
                onChange={handleChange}
              />
              {errors.username && (
                <small className="text-danger">{errors.username}</small>
              )}
            </div>

            {/* Password Input */}
            <div>
              <Label>
                Password <span className="text-error-500">*</span>{" "}
              </Label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showPassword ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  )}
                </span>
              </div>
              {errors.password && (
                <small className="text-danger">{errors.password}</small>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox checked={isChecked} onChange={setIsChecked} />
                <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                  Keep me logged in
                </span>
              </div>
              {/* <Link
                to="/reset-password"
                className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Forgot password?
              </Link> */}
            </div>

            {/* Submit Button */}
            <div>
              <Button className="w-full" size="sm" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-5">
          <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Contact Mojoboxx
            </Link>
          </p>
        </div>
        <AppVersion />
      </div>
    </div>
  );
};

export default SignInForm;

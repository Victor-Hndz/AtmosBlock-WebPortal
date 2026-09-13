import React from "react";
import { TFunction } from "i18next";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface FormAuthAlertProps {
  t: TFunction;
}

const FormAuthAlert: React.FC<FormAuthAlertProps> = ({ t }) => {
  return (
    <div className="auth-alert bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-md" role="alert">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <p className="ml-3 text-sm text-amber-800 font-medium">
          {t("requests-form.loginRequired", "You need to log in to submit a request.")}{" "}
          <Link to="/auth" className="underline">
            {t("requests-form.loginLink", "Log in")}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default React.memo(FormAuthAlert);

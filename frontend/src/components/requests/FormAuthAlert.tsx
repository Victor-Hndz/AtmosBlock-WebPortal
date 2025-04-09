import React from "react";
import { TFunction } from "i18next";
import { AlertCircle } from "lucide-react";

interface FormAuthAlertProps {
  t: TFunction;
}

const FormAuthAlert: React.FC<FormAuthAlertProps> = ({ t }) => {
  return (
    <div className="auth-alert bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-md" role="alert">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <p className="ml-3 text-sm text-amber-800 font-medium">
          {t("requests-form.anonymousWarning", "You are not logged in. Your request will be processed anonymously.")}
        </p>
      </div>
    </div>
  );
};

export default React.memo(FormAuthAlert);

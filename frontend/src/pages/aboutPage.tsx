import { JSX } from "react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, ExternalLink, SendHorizontal, CheckCircle } from "lucide-react";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import * as Separator from "@radix-ui/react-separator";
import * as Form from "@radix-ui/react-form";
import * as Toast from "@radix-ui/react-toast";
import "./aboutPage.css";

/**
 * AboutPage component
 * Provides information about the project and contact functionality
 *
 * @returns {JSX.Element} The AboutPage component
 */
const AboutPage: React.FC = (): JSX.Element => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handles the contact form submission
   * Opens email client with pre-filled information
   *
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create mailto link with form data
    const subject = `Contact from ${name} via FAST-IBAN Project`;
    const body = `Message from ${name} (${email}):\n\n${message}`;
    const mailtoLink = `mailto:vic.hernandezs08@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open email client
    window.open(mailtoLink, "_blank");

    // Show success toast and reset form
    setTimeout(() => {
      setIsSubmitting(false);
      setToastOpen(true);
      setName("");
      setEmail("");
      setMessage("");
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Project Information Section */}
      <section className="mb-12">
        <h1 className="text-3xl font-bold mb-4 text-slate-900">{t("about.title")}</h1>
        <p className="text-lg text-slate-600 mb-6">{t("about.description")}</p>

        <div className="project-info-container">
          <h2 className="text-xl font-semibold mb-3 text-slate-800">{t("about.projectOverview")}</h2>
          <p className="text-slate-700 mb-4">{t("about.projectDescription")}</p>

          <h3 className="text-lg font-medium mt-6 mb-2 text-slate-800">{t("about.technologies")}</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>{t("about.techStack.frontend")}</li>
            <li>{t("about.techStack.backend")}</li>
            <li>{t("about.techStack.processing")}</li>
          </ul>
        </div>

        {/* External Links */}
        <div className="flex justify-center">
          <div className="flex flex-wrap gap-4 items-center external-links-container">
            <a
              href="https://github.com/Victor-Hndz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
            >
              <FaGithub size={18} />
              <span>{t("about.links.github")}</span>
            </a>
            <a
              href="https://linkedin.com/in/víctor-hernández-sánchez-a19361239"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FaLinkedin size={18} />
              <span>{t("about.links.linkedin")}</span>
            </a>
            <a
              href="https://www.um.es"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 um-link rounded-md"
            >
              <ExternalLink size={18} />
              <span>{t("about.links.universityUM")}</span>
            </a>
            <a
              href="https://www.umh.es"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 umh-link rounded-md"
            >
              <ExternalLink size={18} />
              <span>{t("about.links.universityUMH")}</span>
            </a>
          </div>
        </div>
      </section>

      <Separator.Root className="h-px bg-slate-200 my-8" />

      {/* Contact Form Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-slate-900">{t("about.contact.title")}</h2>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start gap-2 mb-6 text-slate-600">
            <Mail className="mt-1 flex-shrink-0" size={20} />
            <p>{t("about.contact.description")}</p>
          </div>

          <Form.Root onSubmit={handleSubmit} className="space-y-4">
            <Form.Field name="name" className="space-y-2">
              <Form.Label className="text-sm font-medium text-slate-700">{t("about.contact.form.name")}</Form.Label>
              <Form.Control asChild>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder={t("about.contact.form.namePlaceholder")}
                />
              </Form.Control>
              <Form.Message match="valueMissing" className="text-sm text-red-600">
                {t("about.contact.form.nameRequired")}
              </Form.Message>
            </Form.Field>

            <Form.Field name="email" className="space-y-2">
              <Form.Label className="text-sm font-medium text-slate-700">{t("about.contact.form.email")}</Form.Label>
              <Form.Control asChild>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder={t("about.contact.form.emailPlaceholder")}
                />
              </Form.Control>
              <Form.Message match="valueMissing" className="text-sm text-red-600">
                {t("about.contact.form.emailRequired")}
              </Form.Message>
              <Form.Message match="typeMismatch" className="text-sm text-red-600">
                {t("about.contact.form.emailInvalid")}
              </Form.Message>
            </Form.Field>

            <Form.Field name="message" className="space-y-2">
              <Form.Label className="text-sm font-medium text-slate-700">{t("about.contact.form.message")}</Form.Label>
              <Form.Control asChild>
                <textarea
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder={t("about.contact.form.messagePlaceholder")}
                />
              </Form.Control>
              <Form.Message match="valueMissing" className="text-sm text-red-600">
                {t("about.contact.form.messageRequired")}
              </Form.Message>
            </Form.Field>

            <Form.Submit asChild>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-2 bg-violet-600 text-white font-medium rounded-md hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>{t("about.contact.form.sending")}</span>
                  </>
                ) : (
                  <>
                    <SendHorizontal size={18} />
                    <span>{t("about.contact.form.send")}</span>
                  </>
                )}
              </button>
            </Form.Submit>
          </Form.Root>
        </div>
      </section>

      {/* Success Toast */}
      <Toast.Provider swipeDirection="right">
        <Toast.Root
          className="bg-white rounded-md shadow-lg border border-slate-200 p-4 grid grid-cols-[auto_max-content] gap-x-4 items-center fixed bottom-4 right-4 data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut"
          open={toastOpen}
          onOpenChange={setToastOpen}
          duration={3000}
        >
          <Toast.Title className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle size={18} />
            {t("about.contact.form.success.title")}
          </Toast.Title>
          <Toast.Description className="text-slate-700 mt-1">
            {t("about.contact.form.success.message")}
          </Toast.Description>
          <Toast.Action className="grid" asChild altText={t("buttons.close")}>
            <button
              className="absolute top-2 right-2 inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label={t("buttons.close")}
            >
              &times;
            </button>
          </Toast.Action>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-0 right-0 p-6 flex flex-col gap-2 w-96 max-w-[100vw] m-0 list-none z-50" />
      </Toast.Provider>
    </div>
  );
};

export default AboutPage;

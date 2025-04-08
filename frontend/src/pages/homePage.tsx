import React, { JSX } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Download, ArrowRight, BarChart, Database, CloudLightning } from "lucide-react";
import * as Separator from "@radix-ui/react-separator";
import * as HoverCard from "@radix-ui/react-hover-card";
import * as Tabs from "@radix-ui/react-tabs";
import { useAppSelector } from "@/redux/hooks";

/**
 * HomePage component
 * Landing page with introduction to the application features
 *
 * @returns JSX.Element - The rendered HomePage component
 */
export default function HomePage(): JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated } = useAppSelector(state => state.auth);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">{t("home.hero.title")}</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">{t("home.hero.subtitle")}</p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            to="/requests"
            className="px-6 py-3 rounded-lg bg-violet-600 text-white font-medium flex items-center gap-2 hover:bg-violet-700 transition-colors"
          >
            {t("home.hero.primaryCta")}
            <ArrowRight size={16} />
          </Link>
          {!isAuthenticated && (
            <Link
              to="/auth"
              className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              {t("home.hero.secondaryCta")}
            </Link>
          )}
        </div>
      </section>

      <Separator.Root className="h-px bg-slate-200 w-full max-w-4xl mx-auto" />

      {/* Features Section */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-8 text-slate-900">{t("home.features.title")}</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Database className="h-8 w-8 text-violet-600" />}
            title={t("home.features.feature1.title")}
            description={t("home.features.feature1.description")}
          />
          <FeatureCard
            icon={<BarChart className="h-8 w-8 text-violet-600" />}
            title={t("home.features.feature2.title")}
            description={t("home.features.feature2.description")}
          />
          <FeatureCard
            icon={<CloudLightning className="h-8 w-8 text-violet-600" />}
            title={t("home.features.feature3.title")}
            description={t("home.features.feature3.description")}
          />
        </div>
      </section>

      {/* Data Examples Section */}
      <section className="bg-slate-50 py-10 px-4 rounded-xl max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6 text-slate-900">{t("home.dataExamples.title")}</h2>
        <Tabs.Root defaultValue="tab1" className="w-full">
          <Tabs.List className="flex border-b border-slate-200 mb-6">
            <Tabs.Trigger
              value="tab1"
              className="px-4 py-2 text-slate-600 font-medium data-[state=active]:text-violet-600 data-[state=active]:border-b-2 data-[state=active]:border-violet-600"
            >
              {t("home.dataExamples.tab1")}
            </Tabs.Trigger>
            <Tabs.Trigger
              value="tab2"
              className="px-4 py-2 text-slate-600 font-medium data-[state=active]:text-violet-600 data-[state=active]:border-b-2 data-[state=active]:border-violet-600"
            >
              {t("home.dataExamples.tab2")}
            </Tabs.Trigger>
            <Tabs.Trigger
              value="tab3"
              className="px-4 py-2 text-slate-600 font-medium data-[state=active]:text-violet-600 data-[state=active]:border-b-2 data-[state=active]:border-violet-600"
            >
              {t("home.dataExamples.tab3")}
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab1" className="p-4 bg-white rounded-lg shadow-sm">
            <p className="text-slate-700">{t("home.dataExamples.content1")}</p>
          </Tabs.Content>
          <Tabs.Content value="tab2" className="p-4 bg-white rounded-lg shadow-sm">
            <p className="text-slate-700">{t("home.dataExamples.content2")}</p>
          </Tabs.Content>
          <Tabs.Content value="tab3" className="p-4 bg-white rounded-lg shadow-sm">
            <p className="text-slate-700">{t("home.dataExamples.content3")}</p>
          </Tabs.Content>
        </Tabs.Root>
      </section>

      {/* Call To Action Section */}
      <section className="text-center bg-violet-50 py-12 px-4 rounded-xl max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-slate-900">{t("home.cta.title")}</h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">{t("home.cta.description")}</p>
        <Link
          to="/requests"
          className="px-6 py-3 rounded-lg bg-violet-600 text-white font-medium inline-flex items-center gap-2 hover:bg-violet-700 transition-colors"
        >
          <Download size={16} />
          {t("home.cta.buttonText")}
        </Link>
      </section>
    </div>
  );
}

/**
 * Feature card component properties
 */
interface FeatureCardProps {
  /** Icon element to display */
  icon: React.ReactNode;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
}

/**
 * FeatureCard component
 * Displays a feature with icon, title, and description
 *
 * @param props - Component properties
 * @returns JSX.Element - The rendered FeatureCard component
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <HoverCard.Root>
      <HoverCard.Trigger asChild>
        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
          <div className="mb-4">{icon}</div>
          <h3 className="text-xl font-semibold mb-2 text-slate-800">{title}</h3>
          <p className="text-slate-600">{description}</p>
        </div>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          className="p-4 bg-white rounded-lg shadow-md border border-slate-200 w-64 z-50"
          sideOffset={5}
        >
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
            <p className="text-xs text-slate-700">{description}</p>
          </div>
          <HoverCard.Arrow className="fill-white" />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};

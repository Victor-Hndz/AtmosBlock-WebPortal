import { JSX } from "react";
import { Info, Target, History, Mail, Heart, Building } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Separator from "@radix-ui/react-separator";
import * as Tooltip from "@radix-ui/react-tooltip";

/**
 * About page component
 * Displays information about the company, team, mission, and history
 *
 * @returns {JSX.Element} The rendered About page component
 */
export default function About(): JSX.Element {
  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Info className="h-6 w-6 text-blue-600" aria-hidden="true" />
            About Our Company
          </h1>
          <Separator.Root className="h-[1px] bg-gray-200 my-4" />
          <p className="text-gray-600 max-w-2xl">
            Learn about our company's mission, team, and history. We're dedicated to providing excellent service and
            innovative solutions.
          </p>
        </header>

        <Tooltip.Provider>
          <Tabs.Root defaultValue="company" className="w-full">
            <Tabs.List className="flex border-b border-gray-200" aria-label="About sections">
              {[
                { id: "company", label: "Company", icon: <Building className="h-4 w-4" /> },
                { id: "mission", label: "Mission", icon: <Target className="h-4 w-4" /> },
                { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
              ].map(tab => (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className="px-4 py-2 flex items-center gap-2 text-gray-600 hover:text-blue-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                >
                  {tab.icon}
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <Tabs.Content value="company" className="pt-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Our Company</h2>
                <p className="text-gray-600 mb-4">
                  Founded in 2010, our company has been at the forefront of innovation and excellence. We specialize in
                  developing cutting-edge solutions that help businesses grow and thrive.
                </p>
                <p className="text-gray-600">
                  With offices in major cities worldwide, we serve clients across various industries, delivering
                  reliable products and exceptional service.
                </p>
              </div>
            </Tabs.Content>

            <Tabs.Content value="mission" className="pt-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  Our Mission <Heart className="h-5 w-5 text-red-500" aria-hidden="true" />
                </h2>
                <p className="text-gray-600 mb-4">
                  We are committed to delivering excellence in everything we do, providing innovative solutions that
                  empower our clients and make a positive impact on the world.
                </p>
                <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-6">Core Values</h3>
                <ul className="list-disc list-inside text-gray-600">
                  <li className="mb-2">Innovation: We constantly seek new and better ways to solve problems</li>
                  <li className="mb-2">Integrity: We act with honesty and transparency in all our dealings</li>
                  <li className="mb-2">Excellence: We strive for the highest quality in our products and services</li>
                  <li>Collaboration: We believe in the power of working together to achieve common goals</li>
                </ul>
              </div>
            </Tabs.Content>

            <Tabs.Content value="history" className="pt-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Our History</h2>

                <div className="space-y-6">
                  {milestones.map(milestone => (
                    <div key={milestone.year} className="flex">
                      <div className="mr-4">
                        <div className="bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full text-sm">
                          {milestone.year}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{milestone.title}</h3>
                        <p className="text-gray-600 mt-1">{milestone.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </Tooltip.Provider>

        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Contact Us
          </h2>
          <p className="text-gray-600 mb-2">Have questions or want to learn more? Get in touch with our team.</p>
          <a
            href="mailto:info@company.com"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Send us an email
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Historical milestone type definition
 */
interface Milestone {
  year: string;
  title: string;
  description: string;
}

/**
 * Company milestones data
 */
const milestones: Milestone[] = [
  {
    year: "2010",
    title: "Company Founded",
    description: "Our company was established with a vision to revolutionize the industry.",
  },
  {
    year: "2015",
    title: "International Expansion",
    description: "We opened our first international office and began serving clients globally.",
  },
  {
    year: "2018",
    title: "Major Product Launch",
    description: "Released our flagship product that became an industry standard.",
  },
  {
    year: "2022",
    title: "Sustainability Initiative",
    description: "Launched comprehensive sustainability program with commitment to net zero emissions.",
  },
];

import { API_URL } from "@/consts/apiConsts";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export interface ResultFile {
  name: string;
  url: string;
  type: "image" | "data";
  previewUrl?: string;
}

export interface ResultsData {
  requestHash: string;
  files: ResultFile[];
  status: "complete" | "error";
  message?: string;
}

export const ResultsService = {
  /**
   * Fetch result files for a specific request
   * @param requestHash The hash of the request
   * @returns Promise resolving to results data
   */
  getResultFiles: async (requestHash: string): Promise<ResultsData> => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Use the correct API endpoint to get results
      const response = await fetch(`${API_URL}/results/${requestHash}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message ?? "Failed to fetch result files");
      }

      const data = await response.json();
      console.log("Received result data:", data);
      return data;
    } catch (error) {
      console.error("Error fetching results:", error);
      throw error instanceof Error ? error : new Error("Unknown error occurred");
    }
  },

  /**
   * Download all result files as a ZIP archive
   * @param files Array of result files to download
   * @param requestHash Hash of the request for naming the ZIP file
   */
  downloadAllFiles: async (files: ResultFile[]): Promise<void> => {
    try {
      const zip = new JSZip();

      // Add all files to the zip
      const fetchPromises = files.map(async file => {
        try {
          console.log(`Downloading file: ${file.name} from URL: ${file.url}`);
          const response = await fetch(file.url);
          if (!response.ok) {
            console.error(`Error downloading file ${file.name}: ${response.statusText}`);
            return;
          }
          const blob = await response.blob();
          zip.file(file.name, blob);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      });

      // Wait for all files to be fetched and added to the zip
      await Promise.all(fetchPromises);

      // Generate the zip file and save it
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `generated-results.zip`);
    } catch (error) {
      console.error("Error downloading files:", error);
      throw error instanceof Error ? error : new Error("Failed to download files");
    }
  },

  /**
   * Determine if a file is an image that can be previewed
   * @param fileName The name of the file
   * @returns Boolean indicating if the file is previewable
   */
  isPreviewableImage: (fileName: string): boolean => {
    const lowerName = fileName.toLowerCase();
    return (
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".svg") ||
      lowerName.endsWith(".gif") ||
      lowerName.endsWith(".pdf")
    );
  },
};

export default ResultsService;

import { useEffect, useRef, useState } from "react";
import { CSVLink } from "react-csv";
import { Button } from "antd";

type HeadColumn = {
  title: string;
  dataIndex: string;
  key: string;
};

type CsvDownloadProps = {
  // DateRange: [string, string];
  // logsType: string | undefined;
  Headcolumns: HeadColumn[];
  filename?: string;
  /** Returns either table rows (client CSV) or a raw CSV string (server CSV) */
  loadCSVData: () => Promise<any[] | string>;
};

const triggerBlobDownload = (csvText: string, filename: string) => {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const CsvDownload = ({
  // DateRange,
  // logsType,
  Headcolumns,
  filename = "logs.csv",
  loadCSVData,
}: CsvDownloadProps) => {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const csvRef = useRef<any>(null);

  // 🔹 Convert AntD headers → CSV headers
  const csvHeaders = Headcolumns.map((col) => ({
    label: col.title,
    key: col.key,
  }));

  // 🔹 Trigger download when csvData is populated (client-built rows)
  useEffect(() => {
    if (csvData.length > 0) {
      csvRef.current?.link?.click();
    }
  }, [csvData]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const result = await loadCSVData();
      if (typeof result === "string") {
        if (!result.trim()) {
          console.error("CSV download error: empty response");
          return;
        }
        triggerBlobDownload(result, filename);
        return;
      }
      setCsvData(result);
    } catch (err) {
      console.error("CSV download error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="primary" loading={loading} onClick={handleDownload}>
        Download CSV
      </Button>

      {/* Hidden CSV link — triggered programmatically for row-based exports */}
      <CSVLink
        data={csvData}
        headers={csvHeaders}
        filename={filename}
        ref={csvRef}
        style={{ display: "none" }}
      />
    </>
  );
};

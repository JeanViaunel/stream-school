"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ImportTemplateDownloadProps {
  filename?: string;
}

export function ImportTemplateDownload({ 
  filename = "student_import_template.csv" 
}: ImportTemplateDownloadProps) {
  const handleDownload = () => {
    const csvContent = `username,displayName,password,gradeLevel
john.doe,John Doe,TempPass123,9
jane.smith,Jane Smith,TempPass123,10
alex.johnson,Alex Johnson,TempPass123,11
sarah.williams,Sarah Williams,TempPass123,9
michael.brown,Michael Brown,TempPass123,10`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Download Template
    </Button>
  );
}

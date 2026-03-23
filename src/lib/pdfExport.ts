"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface ReportData {
  studentName: string;
  generatedAt: string;
  classes: Array<{
    name: string;
    subject: string;
    teacher: string;
    assignments: Array<{
      title: string;
      score?: number;
      maxScore: number;
      status: string;
      dueDate?: string;
    }>;
  }>;
  stats: {
    totalClasses: number;
    totalAssignments: number;
    completedAssignments: number;
    averageGrade?: number;
  };
}

export function generateStudentReport(data: ReportData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(59, 130, 246); // Primary color
  doc.text("StreamSchool", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("Student Progress Report", pageWidth / 2, 30, { align: "center" });
  
  // Student Info
  doc.setFontSize(12);
  doc.text(`Student: ${data.studentName}`, 20, 50);
  doc.text(`Generated: ${format(new Date(data.generatedAt), "MMM d, yyyy")}`, 20, 58);
  
  // Summary Stats
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text("Summary", 20, 75);
  
  const statsData = [
    ["Total Classes", data.stats.totalClasses.toString()],
    ["Total Assignments", data.stats.totalAssignments.toString()],
    ["Completed", data.stats.completedAssignments.toString()],
    ["Average Grade", data.stats.averageGrade ? `${data.stats.averageGrade.toFixed(1)}%` : "N/A"],
  ];
  
  autoTable(doc, {
    startY: 80,
    head: [["Metric", "Value"]],
    body: statsData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  
  // Per Class Details
  data.classes.forEach((cls, index) => {
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text(`${cls.name} (${cls.subject})`, 20, currentY);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Teacher: ${cls.teacher}`, 20, currentY + 6);
    
    if (cls.assignments.length > 0) {
      const assignmentData = cls.assignments.map((a) => [
        a.title,
        a.status,
        a.dueDate ? format(new Date(a.dueDate), "MMM d") : "No due date",
        a.score !== undefined ? `${a.score}/${a.maxScore}` : "Not graded",
        a.score !== undefined ? `${((a.score / a.maxScore) * 100).toFixed(0)}%` : "-",
      ]);
      
      autoTable(doc, {
        startY: currentY + 12,
        head: [["Assignment", "Status", "Due Date", "Score", "Percentage"]],
        body: assignmentData,
        theme: "striped",
        headStyles: { fillColor: [100, 100, 100] },
        styles: { fontSize: 9 },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("No assignments yet", 20, currentY + 12);
      currentY += 20;
    }
  });
  
  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages} | StreamSchool Student Report`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
  
  return doc;
}

export function downloadReport(data: ReportData, filename?: string) {
  const doc = generateStudentReport(data);
  const defaultFilename = `${data.studentName.replace(/\s+/g, "_")}_report_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename || defaultFilename);
}

export function generateAnalyticsPDF(
  analytics: any,
  studentName: string
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(59, 130, 246);
  doc.text("StreamSchool", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("Learning Analytics Report", pageWidth / 2, 30, { align: "center" });
  
  doc.setFontSize(12);
  doc.text(`Student: ${studentName}`, 20, 50);
  doc.text(`Generated: ${format(new Date(), "MMM d, yyyy")}`, 20, 58);
  
  // Overview Stats
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text("Overview", 20, 75);
  
  const overviewData = [
    ["Total Classes", analytics.totalClasses?.toString() || "0"],
    ["Total Assignments", analytics.totalAssignments?.toString() || "0"],
    ["Completed Assignments", analytics.completedAssignments?.toString() || "0"],
    ["Sessions Attended", analytics.totalSessionsAttended?.toString() || "0"],
    ["Hours Learned", analytics.totalHoursLearned?.toString() || "0"],
    ["Current Streak", `${analytics.currentStreak || 0} days`],
    ["Longest Streak", `${analytics.longestStreak || 0} days`],
  ];
  
  if (analytics.averageGrade) {
    overviewData.push(["Average Grade", `${analytics.averageGrade.toFixed(1)}%`]);
  }
  
  autoTable(doc, {
    startY: 80,
    head: [["Metric", "Value"]],
    body: overviewData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Weekly Activity
  if (analytics.weeklyActivity && analytics.weeklyActivity.length > 0) {
    const currentY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text("Weekly Activity", 20, currentY);
    
    const activityData = analytics.weeklyActivity.map((day: any) => [
      day.day,
      day.sessions.toString(),
      day.assignments.toString(),
      `${day.hours}h`,
    ]);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [["Day", "Sessions", "Assignments", "Hours"]],
      body: activityData,
      theme: "striped",
      headStyles: { fillColor: [100, 100, 100] },
    });
  }
  
  // Grade Distribution
  if (analytics.gradeDistribution) {
    const currentY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text("Grade Distribution", 20, currentY);
    
    const gradeData = [
      ["Excellent (90-100%)", analytics.gradeDistribution.excellent?.toString() || "0"],
      ["Good (80-89%)", analytics.gradeDistribution.good?.toString() || "0"],
      ["Average (70-79%)", analytics.gradeDistribution.average?.toString() || "0"],
      ["Below Average (60-69%)", analytics.gradeDistribution.belowAverage?.toString() || "0"],
      ["Failing (<60%)", analytics.gradeDistribution.failing?.toString() || "0"],
    ];
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [["Category", "Count"]],
      body: gradeData,
      theme: "striped",
      headStyles: { fillColor: [100, 100, 100] },
    });
  }
  
  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages} | StreamSchool Analytics Report`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
  
  return doc;
}

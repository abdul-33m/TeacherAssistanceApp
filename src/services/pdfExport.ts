import jsPDF from 'jspdf';
import { ClassGroup, Student, Assignment, GradeRecord, AttendanceRecord, LessonPlan, GrammarExercise } from '../types';

export const PdfExportService = {
  /**
   * Generates a formal, beautiful Student Progress Report for parents
   */
  generateStudentReport(
    student: Student,
    classGroup: ClassGroup,
    attendanceRecords: AttendanceRecord[],
    assignments: Assignment[],
    grades: GradeRecord[],
    teacherNote?: string,
    lessonProgress?: any[],
    lessons?: LessonPlan[],
    cumulative?: any
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = classGroup.color || '#1e293b';

    // Header Banner
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 30, 'F');

    // Accent line in class color
    doc.setFillColor(primaryColor);
    doc.rect(0, 30, 210, 2.5, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('STUDENT PROGRESS & PERFORMANCE REPORT', 14, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subject: ${classGroup.subject} | Class: ${classGroup.name} (${classGroup.academicYear})`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, 150, 22);

    // Student Info Card
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Student Profile', 14, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Student: ${student.name} (Roll #${student.rollNumber})`, 14, 46);
    doc.text(`Parent/Guardian: ${student.guardianName || 'N/A'} | Contact: ${student.guardianContact || 'N/A'}`, 14, 51);
    if (student.accommodations) {
      doc.text(`Accommodations / Learning Focus: ${student.accommodations}`, 14, 56);
    }

    // Attendance Metrics Calculation
    let totalDays = 0;
    let presentDays = 0;
    let tardyDays = 0;
    attendanceRecords.forEach((att) => {
      const status = att.records[student.id];
      if (status) {
        totalDays++;
        if (status === 'present' || status === 'P') presentDays++;
        else if (status === 'tardy' || status === 'Permitted') tardyDays++;
      }
    });

    const attendanceRate = totalDays > 0 ? Math.round(((presentDays + tardyDays * 0.8) / totalDays) * 100) : 100;

    // Academic Scores & Completion Calculation
    const studentGrades = grades.filter((g) => g.studentId === student.id);
    let totalScore = 0;
    let totalMax = 0;
    let completedCount = 0;

    studentGrades.forEach((g) => {
      const asg = assignments.find((a) => a.id === g.assignmentId);
      if (asg) {
        totalScore += g.score;
        totalMax += asg.maxPoints;
        if (g.completionStatus === 'completed' || (!g.completionStatus && g.score > 0)) {
          completedCount++;
        }
      }
    });

    const gradePercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 92;
    let letterGrade = 'A';
    if (gradePercentage >= 90) letterGrade = 'A';
    else if (gradePercentage >= 80) letterGrade = 'B';
    else if (gradePercentage >= 70) letterGrade = 'C';
    else if (gradePercentage >= 60) letterGrade = 'D';
    else letterGrade = 'F';

    // Summary Metric Badges (Boxes)
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 62, 42, 18, 2, 2, 'FD');
    doc.roundedRect(60, 62, 42, 18, 2, 2, 'FD');
    doc.roundedRect(106, 62, 42, 18, 2, 2, 'FD');
    doc.roundedRect(152, 62, 44, 18, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('GRADE AVERAGE', 18, 68);
    doc.text('ASSIGNMENT STATUS', 64, 68);
    doc.text('ATTENDANCE RATE', 110, 68);
    doc.text('LESSON MASTERY', 156, 68);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${gradePercentage}% (${letterGrade})`, 18, 76);
    doc.text(`${completedCount} Completed`, 64, 76);
    doc.text(`${attendanceRate}%`, 110, 76);

    const sLessonProg = (lessonProgress || []).filter((lp: any) => lp.studentId === student.id);
    const masteredCount = sLessonProg.filter((lp: any) => lp.status === 'mastered').length;
    doc.text(`${masteredCount} Mastered`, 156, 76);

    // Section 1: Assignment Performance & Feedback Table
    doc.setFontSize(10.5);
    doc.text('Assignments, Completion Status & Teacher Feedback', 14, 88);

    doc.setFillColor(241, 245, 249);
    doc.rect(14, 91, 182, 6.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Assignment Title', 16, 95.5);
    doc.text('Score', 82, 95.5);
    doc.text('Completion Status', 106, 95.5);
    doc.text('Teacher Specific Feedback & Notes', 140, 95.5);

    let y = 102;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const studentAssignments = assignments.filter((a) => a.classId === classGroup.id || a.classId.startsWith('all'));
    studentAssignments.slice(0, 5).forEach((asg) => {
      const grade = grades.find((g) => g.assignmentId === asg.id && g.studentId === student.id);
      doc.setTextColor(30, 41, 59);
      doc.text(asg.title.substring(0, 32), 16, y);

      if (grade) {
        doc.text(`${grade.score}/${asg.maxPoints}`, 82, y);
        const statusLabel = grade.completionStatus ? grade.completionStatus.toUpperCase() : 'COMPLETED';
        doc.text(statusLabel, 106, y);
        const feedbackSnippet = grade.feedback ? grade.feedback.substring(0, 38) : 'Good effort on task.';
        doc.text(feedbackSnippet, 140, y);
      } else {
        doc.setTextColor(156, 163, 175);
        doc.text(`-/ ${asg.maxPoints}`, 82, y);
        doc.text('PENDING', 106, y);
        doc.text('In progress', 140, y);
        doc.setTextColor(30, 41, 59);
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 2, 196, y + 2);
      y += 7;
    });

    // Section 2: Lesson Completion & Comprehension Table
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Lesson Completion & Conceptual Mastery', 14, y);
    y += 3.5;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 6.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Lesson Focus & Unit', 16, y + 4.5);
    doc.text('Mastery Status', 82, y + 4.5);
    doc.text('Exit Ticket', 115, y + 4.5);
    doc.text('Teacher Observations', 140, y + 4.5);

    y += 9.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const classLessons = (lessons || []).filter((l) => l.classId === classGroup.id || l.grade === classGroup.grade);
    classLessons.slice(0, 3).forEach((les) => {
      const lProg = sLessonProg.find((lp: any) => lp.lessonId === les.id);
      doc.setTextColor(30, 41, 59);
      doc.text(les.title.substring(0, 32), 16, y);

      const statusText = lProg?.status ? lProg.status.replace('_', ' ').toUpperCase() : 'IN PROGRESS';
      doc.text(statusText, 82, y);
      doc.text(lProg?.exitTicketCompleted ? `${lProg.exitTicketScore || 5}/5 Passed` : 'Pending', 115, y);
      doc.text((lProg?.notes || 'Engaged during direct instruction.').substring(0, 38), 140, y);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 2, 196, y + 2);
      y += 7;
    });

    // Section 3: Cumulative Teacher Observations & Growth Goals
    y += 4;
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Cumulative Teacher Observations & Actionable Goals', 14, y);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, y + 3, 182, 34, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    const feedbackText =
      cumulative?.generalNotes ||
      teacherNote ||
      `${student.name} demonstrates solid participation in English (${classGroup.subject}). Active contributor in class discussions with consistent homework completion.`;

    const goalsText = cumulative?.targetGoals ? `\nTarget Goal: ${cumulative.targetGoals}` : '';
    const fullText = feedbackText + goalsText;
    const splitFeedback = doc.splitTextToSize(fullText, 174);
    doc.text(splitFeedback, 18, y + 10);

    // Signatures
    const signY = 252;
    doc.setDrawColor(148, 163, 184);
    doc.line(18, signY, 80, signY);
    doc.line(120, signY, 182, signY);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('English Teacher Signature', 18, signY + 5);
    doc.text('Parent / Guardian Signature', 120, signY + 5);

    doc.setFontSize(7.5);
    doc.text('GradeCraft Educational System • Student Progress & Learning Record', 55, 282);

    doc.save(`${student.name.replace(/\s+/g, '_')}_Progress_Report_${classGroup.name}.pdf`);
  },

  /**
   * Generates a full Landscape Monthly Attendance & Observations Ledger PDF (Days 1-31 + Exam + H.W. + Oral + Notes)
   */
  /**
   * Generates a full Landscape Monthly Attendance & Observations Ledger PDF (Days 1-31 + Exam + H.W. + Oral + Notes)
   * Fully supports large classes exceeding 80 students across clean paginated sheets with repeating headers
   */
  generateMonthlyRegisterPdf(
    classGroup: ClassGroup,
    students: Student[],
    attendance: AttendanceRecord[],
    monthlyAssessments: any[],
    yearMonth: string // "YYYY-MM"
  ): void {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const [year, monthNum] = yearMonth.split('-');
    const dateObj = new Date(Number(year), Number(monthNum) - 1, 1);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(Number(year), Number(monthNum), 0).getDate();

    const dayColWidth = 4.3;
    const dayStartX = 54;
    const assessX = dayStartX + daysInMonth * dayColWidth + 2;

    const rowsPerPage = 22;
    const totalPages = Math.max(1, Math.ceil(students.length / rowsPerPage));

    const drawHeader = (pageIndex: number) => {
      // Header Bar
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 18, 'F');
      doc.setFillColor(classGroup.color || '#3b82f6');
      doc.rect(0, 18, 297, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`MONTHLY ATTENDANCE & CONTINUOUS ASSESSMENT LEDGER`, 14, 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Class: ${classGroup.name} (${classGroup.subject}) | Month: ${monthName} | Total Enrolled: ${students.length} | Page ${pageIndex} of ${totalPages}`,
        14,
        15
      );
      doc.text(`Legend: P = Present | A = Absent | L = Permitted / Excused`, 200, 15);

      // Table Column Header Row
      const startY = 24;
      doc.setFillColor(241, 245, 249);
      doc.rect(8, startY, 281, 6.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Roll', 9, startY + 4.2);
      doc.text('Student Name', 16, startY + 4.2);

      // Day numbers (1..daysInMonth)
      for (let d = 1; d <= daysInMonth; d++) {
        const x = dayStartX + (d - 1) * dayColWidth;
        doc.text(String(d), x + 0.8, startY + 4.2);
      }

      // Assessment Columns
      doc.text('P', assessX, startY + 4.2);
      doc.text('A', assessX + 6, startY + 4.2);
      doc.text('Perm', assessX + 12, startY + 4.2);
      doc.text('Exam', assessX + 22, startY + 4.2);
      doc.text('H.W.', assessX + 33, startY + 4.2);
      doc.text('Oral', assessX + 44, startY + 4.2);
      doc.text('Monthly Observation Notes', assessX + 54, startY + 4.2);

      return startY + 10;
    };

    let currentPage = 1;
    let rowY = drawHeader(currentPage);

    students.forEach((student, index) => {
      // Check if page break needed
      if (rowY + 6.5 > 195) {
        // Footer on current page
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `GradeCraft Educational System • Monthly Register • Page ${currentPage} of ${totalPages}`,
          14,
          202
        );

        doc.addPage();
        currentPage++;
        rowY = drawHeader(currentPage);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`#${student.rollNumber}`, 9, rowY);
      doc.text(student.name.substring(0, 18), 16, rowY);

      let pCount = 0;
      let aCount = 0;
      let permCount = 0;

      // Fill in days
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
        const attRec = attendance.find((a) => a.classId === classGroup.id && a.date === dayStr);
        const st = attRec?.records[student.id];
        const cellX = dayStartX + (d - 1) * dayColWidth;

        if (st === 'P' || st === 'present') {
          pCount++;
          doc.setTextColor(16, 185, 129); // green
          doc.text('P', cellX + 1.2, rowY);
        } else if (st === 'A' || st === 'absent') {
          aCount++;
          doc.setTextColor(239, 68, 68); // red
          doc.text('A', cellX + 1.2, rowY);
        } else if (st === 'Permitted' || st === 'tardy' || st === 'excused') {
          permCount++;
          doc.setTextColor(59, 130, 246); // blue
          doc.text('L', cellX + 1.2, rowY);
        } else {
          doc.setTextColor(203, 213, 225);
          doc.text('·', cellX + 1.5, rowY);
        }
      }

      // Assessment Record
      const assess = monthlyAssessments.find(
        (m) => m.classId === classGroup.id && m.studentId === student.id && m.month === yearMonth
      );

      doc.setTextColor(15, 23, 42);
      doc.text(String(pCount), assessX, rowY);
      doc.text(String(aCount), assessX + 6, rowY);
      doc.text(String(permCount), assessX + 12, rowY);
      doc.text(assess?.monthlyExamScore ? `${assess.monthlyExamScore}` : '-', assessX + 22, rowY);
      doc.text(assess?.hwScore ? `${assess.hwScore}%` : '-', assessX + 33, rowY);
      doc.text(assess?.oralParticipationScore ? `${assess.oralParticipationScore}/5` : '-', assessX + 44, rowY);
      doc.text((assess?.notes || '').substring(0, 28), assessX + 54, rowY);

      // Line
      doc.setDrawColor(241, 245, 249);
      doc.line(8, rowY + 1.8, 289, rowY + 1.8);
      rowY += 6.5;
    });

    // Final Page Footer
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `GradeCraft Educational System • Monthly Register • Page ${currentPage} of ${totalPages} • Class: ${classGroup.name}`,
      14,
      202
    );

    doc.save(`${classGroup.name}_Monthly_Register_${yearMonth}.pdf`);
  },

  /**
   * Generates a Class Gradebook & Attendance Overview Summary
   */
  generateClassSummary(
    classGroup: ClassGroup,
    students: Student[],
    assignments: Assignment[],
    grades: GradeRecord[],
    attendance: AttendanceRecord[]
  ): void {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const rowsPerPage = 17;
    const totalPages = Math.max(1, Math.ceil(students.length / rowsPerPage));

    const drawHeader = (pageIndex: number) => {
      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 20, 'F');
      doc.setFillColor(classGroup.color || '#3b82f6');
      doc.rect(0, 20, 297, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`CLASS SUMMARY ROSTER: ${classGroup.name.toUpperCase()} - ${classGroup.subject}`, 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Academic Year: ${classGroup.academicYear} | Room: ${classGroup.roomNumber || 'N/A'} | Total Enrolled: ${students.length} | Page ${pageIndex} of ${totalPages}`,
        14,
        17
      );
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 240, 17);

      // Table Header
      const headerY = 27;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, headerY, 269, 7.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('Roll', 16, headerY + 5);
      doc.text('Student Name', 28, headerY + 5);
      doc.text('Attendance', 85, headerY + 5);
      doc.text('Avg Grade', 120, headerY + 5);
      doc.text('Status', 150, headerY + 5);
      doc.text('Parent Contact', 185, headerY + 5);
      doc.text('Accommodations', 235, headerY + 5);

      return headerY + 11;
    };

    let currentPage = 1;
    let y = drawHeader(currentPage);

    doc.setFont('helvetica', 'normal');

    students.forEach((s) => {
      if (y + 8 > 192) {
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `GradeCraft Educational System • Class Roster Summary • Page ${currentPage} of ${totalPages}`,
          14,
          200
        );

        doc.addPage();
        currentPage++;
        y = drawHeader(currentPage);
      }

      // Calculate attendance rate
      const classAtt = attendance.filter((a) => a.classId === classGroup.id);
      let present = 0;
      let total = 0;
      classAtt.forEach((a) => {
        if (a.records[s.id]) {
          total++;
          if (a.records[s.id] === 'present' || a.records[s.id] === 'P') present++;
        }
      });
      const attRate = total > 0 ? Math.round((present / total) * 100) : 100;

      // Calculate avg grade
      const sGrades = grades.filter((g) => g.studentId === s.id);
      let scoreSum = 0;
      let maxSum = 0;
      sGrades.forEach((g) => {
        const asg = assignments.find((a) => a.id === g.assignmentId);
        if (asg) {
          scoreSum += g.score;
          maxSum += asg.maxPoints;
        }
      });
      const pct = maxSum > 0 ? Math.round((scoreSum / maxSum) * 100) : 92;

      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`#${s.rollNumber}`, 16, y);
      doc.text(s.name, 28, y);
      doc.text(`${attRate}% (${present}/${total})`, 85, y);
      doc.text(`${pct}% (${pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : 'D'})`, 120, y);

      const status = pct >= 85 ? 'Exceeding' : pct >= 75 ? 'On Track' : 'Needs Support';
      doc.text(status, 150, y);
      doc.text((s.guardianContact || 'N/A').substring(0, 22), 185, y);
      doc.text((s.accommodations || 'None').substring(0, 26), 235, y);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 2, 283, y + 2);
      y += 8;
    });

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `GradeCraft Educational System • Class Roster Summary • Page ${currentPage} of ${totalPages} • Total: ${students.length} Students`,
      14,
      200
    );

    doc.save(`${classGroup.name}_Class_Roster_Summary.pdf`);
  },

  /**
   * Generates a printable Grammar & Lesson Worksheet for study groups and homework
   */
  generateWorksheet(lesson: LessonPlan, exercise?: GrammarExercise): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ENGLISH LANGUAGE ARTS STUDY PACKET', 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Grade ${lesson.grade} | ${lesson.unit} | Focus: ${lesson.grammarFocus}`, 14, 22);

    // Student Header Fill-in
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 34, 182, 16, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text('Student Name: ___________________________', 18, 44);
    doc.text('Class: _______', 120, 44);
    doc.text('Date: ___________', 155, 44);

    let y = 58;

    // Lesson Objectives & Rules
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Lesson: ${lesson.title}`, 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    lesson.objectives.forEach((obj) => {
      doc.text(`• ${obj}`, 18, y);
      y += 5.5;
    });

    y += 4;
    // Grammar Rule Box
    if (exercise) {
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(14, y, 182, 20, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 64, 175);
      doc.text(`Grammar Rule Focus: ${exercise.topic}`, 18, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      const splitRule = doc.splitTextToSize(exercise.rulesExplanation, 174);
      doc.text(splitRule, 18, y + 12);
      y += 26;
    }

    // Exercise Questions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Practice Exercises & Analysis', 14, y);
    y += 7;

    const questions = exercise ? exercise.questions : [];
    if (questions.length > 0) {
      questions.forEach((q, index) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${index + 1}. ${q.prompt}`, 14, y);
        y += 5.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        if (q.options && q.options.length > 0) {
          q.options.forEach((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            doc.text(`[  ] ${letter}. ${opt}`, 20, y);
            y += 5;
          });
        } else {
          doc.text('Answer: __________________________________________________', 20, y);
          y += 6;
        }
        y += 2;
      });
    }

    // Exit ticket box
    y = Math.max(y + 4, 230);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(254, 252, 232);
    doc.roundedRect(14, y, 182, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(133, 77, 14);
    doc.text('Exit Ticket / Comprehension Check:', 18, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(lesson.exitTicket || 'Write a 2-sentence summary illustrating today\'s grammar rule in your own words.', 18, y + 14);

    doc.setDrawColor(202, 138, 4);
    doc.line(18, y + 23, 190, y + 23);
    doc.line(18, y + 30, 190, y + 30);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('GradeCraft Middle School English Curriculum Series', 75, 285);

    doc.save(`English_Worksheet_${lesson.title.replace(/\s+/g, '_')}.pdf`);
  },
};

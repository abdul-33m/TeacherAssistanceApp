import { AppDatabase, ClassGroup, Student, AttendanceRecord, Assignment, GradeRecord, LessonPlan, GrammarExercise, BookStudy, Reminder, MonthlyAssessmentRecord } from '../types';

const STORAGE_KEY = 'gradecraft_teacher_db_v2';
const SNAPSHOTS_KEY = 'gradecraft_db_snapshots';

// Roster generator for realistic classes with 80+ students
const FIRST_NAMES = [
  'Maya', 'Liam', 'Aaliyah', 'Noah', 'Chloe', 'Ethan', 'Grace', 'Lucas', 'Zoe', 'Daniel',
  'Benjamin', 'Sophia', 'Mason', 'Emma', 'Alexander', 'Mia', 'Oliver', 'Amelia', 'Caleb', 'Isabella',
  'Jackson', 'Hannah', 'Samuel', 'Lily', 'Gabriel', 'Victoria', 'Elijah', 'Nathaniel', 'Ava', 'Wyatt',
  'Penelope', 'Henry', 'Scarlett', 'Julian', 'Hazel', 'Sebastian', 'Aria', 'Leo', 'Nora', 'Owen',
  'Elena', 'Jack', 'Layla', 'Luke', 'Ellie', 'Jayden', 'Audrey', 'Levi', 'Bella', 'Isaac',
  'Claire', 'Mateo', 'Skylar', 'Lincoln', 'Lucy', 'Jaxon', 'Paisley', 'Asher', 'Everly', 'Theodore',
  'Anna', 'Josiah', 'Caroline', 'Andrew', 'Nova', 'Thomas', 'Genesis', 'Joshua', 'Emilia', 'Ezra',
  'Kennedy', 'Hudson', 'Samantha', 'Charles', 'Willow', 'Jonathan', 'Kinsley', 'Jaden', 'Naomi', 'Dominic',
  'Aaron', 'Adam', 'Sarah', 'Anthony', 'Allison', 'Ian', 'Gabriella', 'Miles', 'Alice', 'Adrian'
];

const LAST_NAMES = [
  'Lin', 'Walker', 'Khan', 'Hernandez', 'Dubois', 'Patel', 'O\'Connor', 'Rossi', 'Washington', 'Kim',
  'Adams', 'Chen', 'Evans', 'Garcia', 'Wright', 'Tanaka', 'Scott', 'Taylor', 'Morgan', 'Vance',
  'Reed', 'Morales', 'Brooks', 'Zhang', 'Santos', 'Price', 'Foster', 'Cooper', 'Mitchell', 'Turner',
  'Ward', 'Diaz', 'Bailey', 'Rivera', 'Hughes', 'Bennett', 'Gomez', 'Sullivan', 'Alvarez', 'Fischer',
  'Peterson', 'Mendoza', 'Jenkins', 'Reyes', 'Coleman', 'Castillo', 'Hopkins', 'Ramirez', 'Simmons', 'Flores',
  'Graham', 'Gupta', 'Nguyen', 'Ibrahim', 'Okafor', 'Takahashi', 'Larsson', 'Müller', 'Novak', 'Moreau',
  'Silva', 'Kowalski', 'Kovacs', 'Costa', 'Sato', 'Nakamura', 'Hassan', 'Farah', 'Mensah', 'Diallo',
  'Sinclair', 'Donovan', 'Harrington', 'Chambers', 'Gallagher', 'Whitaker', 'Mercer', 'Vaughn', 'Hensley', 'Bradford'
];

const AVATAR_COLORS = [
  '#10b981', '#3b82f6', '#ec4899', '#eab308', '#8b5cf6', '#06b6d4',
  '#f97316', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16', '#a855f7'
];

export function buildClassStudents(classId: string, count: number = 80): Student[] {
  const students: Student[] = [];
  const classPrefix = classId.toLowerCase();

  for (let i = 1; i <= count; i++) {
    const rollNum = String(i).padStart(2, '0');
    const fIdx = (i - 1 + (classId === '6B' ? 12 : classId === '7A' ? 24 : classId === '7B' ? 36 : 0)) % FIRST_NAMES.length;
    const lIdx = ((i * 3) - 1 + (classId === '6B' ? 7 : classId === '7A' ? 15 : classId === '7B' ? 22 : 0)) % LAST_NAMES.length;
    const fName = FIRST_NAMES[fIdx];
    const lName = LAST_NAMES[lIdx];

    let accommodation: string | undefined = undefined;
    if (i === 2) accommodation = 'Extra time on reading passages';
    else if (i === 5) accommodation = 'ELL Vocabulary visual scaffold';
    else if (i === 12) accommodation = 'Prefers front row seating';
    else if (i === 25) accommodation = 'Graphic organizer for narrative essays';
    else if (i === 40) accommodation = 'Audiobook companion for novel study';
    else if (i === 63) accommodation = 'Speech-to-text option for essay drafting';

    students.push({
      id: `s_${classPrefix}_${rollNum}`,
      classId,
      name: `${fName} ${lName}`,
      rollNumber: rollNum,
      guardianName: `Parent of ${fName}`,
      guardianContact: `${fName.toLowerCase()}.${lName.toLowerCase()}@parent-mail.com`,
      accommodations: accommodation,
      avatarColor: AVATAR_COLORS[(i - 1) % AVATAR_COLORS.length],
    });
  }
  return students;
}

export const STUDENTS_6A = buildClassStudents('6A', 80);
export const STUDENTS_6B = buildClassStudents('6B', 80);
export const STUDENTS_7A = buildClassStudents('7A', 80);
export const STUDENTS_7B = buildClassStudents('7B', 80);

export const INITIAL_CLASSES: ClassGroup[] = [
  {
    id: '6A',
    name: 'Class 6A',
    grade: '6',
    section: 'A',
    subject: 'English Language Arts 6',
    academicYear: '2026-2027',
    color: '#10b981', // Emerald
    roomNumber: 'Room 204',
    schedulePeriod: 'Period 1 (08:30 - 09:15 AM)',
    studentIds: STUDENTS_6A.map((s) => s.id),
  },
  {
    id: '6B',
    name: 'Class 6B',
    grade: '6',
    section: 'B',
    subject: 'English Language Arts 6',
    academicYear: '2026-2027',
    color: '#06b6d4', // Cyan
    roomNumber: 'Room 204',
    schedulePeriod: 'Period 2 (09:25 - 10:10 AM)',
    studentIds: STUDENTS_6B.map((s) => s.id),
  },
  {
    id: '7A',
    name: 'Class 7A',
    grade: '7',
    section: 'A',
    subject: 'English Literature & Syntax 7',
    academicYear: '2026-2027',
    color: '#8b5cf6', // Violet
    roomNumber: 'Room 206',
    schedulePeriod: 'Period 4 (11:15 - 12:00 PM)',
    studentIds: STUDENTS_7A.map((s) => s.id),
  },
  {
    id: '7B',
    name: 'Class 7B',
    grade: '7',
    section: 'B',
    subject: 'English Literature & Syntax 7',
    academicYear: '2026-2027',
    color: '#f59e0b', // Amber
    roomNumber: 'Room 206',
    schedulePeriod: 'Period 5 (12:45 - 01:30 PM)',
    studentIds: STUDENTS_7B.map((s) => s.id),
  },
];

export const INITIAL_STUDENTS: Student[] = [
  ...STUDENTS_6A,
  ...STUDENTS_6B,
  ...STUDENTS_7A,
  ...STUDENTS_7B,
];

export const INITIAL_GRAMMAR_EXERCISES: GrammarExercise[] = [
  {
    id: 'g6_1',
    grade: '6',
    title: 'Subject-Verb Agreement Mastery',
    topic: 'Subject-Verb Agreement',
    difficulty: 'intermediate',
    rulesExplanation: 'A singular subject takes a singular verb (ending in -s), whereas a plural subject takes a plural verb. Beware of prepositional phrases between the subject and verb (e.g., "The box of crayons is heavy").',
    assignedClassIds: ['6A', '6B'],
    createdAt: '2026-11-01',
    questions: [
      {
        id: 'q1',
        prompt: 'The bouquet of yellow roses (fill in blank) sweet.',
        type: 'mcq',
        options: ['smell', 'smells', 'are smelling', 'have smelled'],
        correctAnswer: 'smells',
        explanation: 'The true subject is "bouquet" (singular), not the plural prepositional phrase "of yellow roses".',
      },
      {
        id: 'q2',
        prompt: 'Neither the teacher nor the students (fill in blank) the missing book.',
        type: 'mcq',
        options: ['has found', 'have found', 'was finding', 'finds'],
        correctAnswer: 'have found',
        explanation: 'When subjects are joined by "neither... nor", the verb agrees with the subject closest to it ("students" is plural).',
      },
      {
        id: 'q3',
        prompt: 'Each of the participants (receive/receives) a certificate.',
        type: 'mcq',
        options: ['receive', 'receives', 'are receiving', 'have received'],
        correctAnswer: 'receives',
        explanation: '"Each" is an indefinite pronoun that is always singular in standard formal English.',
      },
      {
        id: 'q4',
        prompt: 'Identify the error: "The sound of drums and flutes echo across the valley."',
        type: 'mcq',
        options: ['sound should be sounds', 'echo should be echoes', 'across should be through', 'valley should be valleys'],
        correctAnswer: 'echo should be echoes',
        explanation: 'Subject "sound" is singular; singular verb form is "echoes".',
      },
    ],
  },
  {
    id: 'g6_2',
    grade: '6',
    title: 'Pronoun-Antecedent Agreement',
    topic: 'Pronouns & Antecedents',
    difficulty: 'intermediate',
    rulesExplanation: 'A pronoun must agree with its antecedent in number, person, and gender. When referring to a singular antecedent, use a singular pronoun.',
    assignedClassIds: ['6A', '6B'],
    createdAt: '2026-11-04',
    questions: [
      {
        id: 'q1',
        prompt: 'Every student submitted (his or her / their) essay before noon.',
        type: 'mcq',
        options: ['his or her', 'their', 'its', 'theirs'],
        correctAnswer: 'his or her',
        explanation: '"Every student" is grammatically singular, so traditional formal agreement requires "his or her".',
      },
      {
        id: 'q2',
        prompt: 'The committee published (its / their) annual guidelines.',
        type: 'mcq',
        options: ['its', 'their', 'his', 'our'],
        correctAnswer: 'its',
        explanation: '"Committee" acts as a collective singular noun here, so it takes "its".',
      },
    ],
  },
  {
    id: 'g7_1',
    grade: '7',
    title: 'Active vs. Passive Voice in Narrative & Persuasion',
    topic: 'Active & Passive Voice',
    difficulty: 'intermediate',
    rulesExplanation: 'In active voice, the subject performs the action ("The detective discovered the clue"). In passive voice, the subject receives the action ("The clue was discovered by the detective"). Active voice is generally more dynamic and concise.',
    assignedClassIds: ['7A', '7B'],
    createdAt: '2026-11-05',
    questions: [
      {
        id: 'q1',
        prompt: 'Which sentence is written in ACTIVE voice?',
        type: 'mcq',
        options: [
          'The novel was written by S.E. Hinton when she was sixteen.',
          'S.E. Hinton wrote the novel when she was sixteen.',
          'The story had been admired by generations of teens.',
          'Awards were received by the young author.'
        ],
        correctAnswer: 'S.E. Hinton wrote the novel when she was sixteen.',
        explanation: 'S.E. Hinton (the subject) directly performs the action (wrote).',
      },
      {
        id: 'q2',
        prompt: 'Convert to active voice: "The ancient parchment was carefully unrolled by the archaeologist."',
        type: 'mcq',
        options: [
          'The archaeologist carefully unrolled the ancient parchment.',
          'The archaeologist was unrolling the parchment.',
          'Carefully, the parchment had been unrolled.',
          'By the archaeologist, the parchment was unrolled.'
        ],
        correctAnswer: 'The archaeologist carefully unrolled the ancient parchment.',
        explanation: 'Making "the archaeologist" the subject who verbs "unrolled" creates active voice.',
      },
      {
        id: 'q3',
        prompt: 'When is passive voice preferred in formal writing?',
        type: 'mcq',
        options: [
          'Always in fiction writing',
          'When the doer of the action is unknown or the recipient is the main focus (e.g. scientific lab reports)',
          'To make sentences longer',
          'Never under any circumstances'
        ],
        correctAnswer: 'When the doer of the action is unknown or the recipient is the main focus (e.g. scientific lab reports)',
        explanation: 'Passive voice is appropriate when highlighting the outcome or when the actor is irrelevant or unknown.',
      },
    ],
  },
  {
    id: 'g7_2',
    grade: '7',
    title: 'Dangling & Misplaced Modifiers',
    topic: 'Modifiers & Syntax',
    difficulty: 'advanced',
    rulesExplanation: 'A modifier must clearly and directly point to the word it describes. A misplaced modifier modifies the wrong noun; a dangling modifier has no logical noun to modify in the sentence.',
    assignedClassIds: ['7A', '7B'],
    createdAt: '2026-11-08',
    questions: [
      {
        id: 'q1',
        prompt: 'Identify the misplaced modifier: "Covered in melted chocolate, the boy enjoyed the warm waffle."',
        type: 'mcq',
        options: [
          'It incorrectly implies the boy was covered in melted chocolate',
          'It has no verb',
          'Waffle should be plural',
          'There is no error'
        ],
        correctAnswer: 'It incorrectly implies the boy was covered in melted chocolate',
        explanation: '"Covered in melted chocolate" precedes "the boy", illogically modifying him instead of the waffle.',
      },
      {
        id: 'q2',
        prompt: 'Which sentence corrects the dangling modifier: "Walking through the forest, the tall redwoods amazed us."',
        type: 'mcq',
        options: [
          'Walking through the forest, we were amazed by the tall redwoods.',
          'The tall redwoods, walking through the forest, amazed us.',
          'Amazed by the redwoods, the forest was walked through.',
          'Through the forest walking, redwoods were amazing.'
        ],
        correctAnswer: 'Walking through the forest, we were amazed by the tall redwoods.',
        explanation: '"We" were the ones walking through the forest, so "we" must follow the introductory participial phrase.',
      },
    ],
  },
];

export const INITIAL_LESSON_PLANS: LessonPlan[] = [
  {
    id: 'lp_6a_1',
    classId: '6A',
    grade: '6',
    title: 'Dystopian Worldbuilding & The Power of Memory',
    unit: 'Unit 2: The Giver & Utopian Literature',
    date: '2026-11-12',
    durationMinutes: 45,
    grammarFocus: 'Subject-Verb Agreement in Descriptive Writing',
    objectives: [
      'Analyze how Lois Lowry introduces the concept of "Sameness" in Chapter 3',
      'Identify singular vs. plural subjects in complex descriptive sentences',
      'Compose a 5-sentence reflection on Jonas\'s changing perception',
    ],
    materials: ['The Giver copies', 'Highlighters', 'Sticky notes', 'Grammar chart handout'],
    warmUp: 'Bellringer: If you could erase one negative human memory from the world forever, would you? Why or why not? (3 mins)',
    directInstruction: 'Model close reading of Jonas observing the apple change color. Point out sensory verbs and clarify grammatical agreement between singular objects and action verbs (12 mins).',
    guidedPractice: 'Paired text-detective hunt: students locate 3 examples of figurative language and verify subject-verb concord in each line (15 mins).',
    independentPractice: 'Exit slip prompt: Jonas remarks that "precision of language" is enforced in his community. Write 3 sentences showing precision with compound subjects (10 mins).',
    exitTicket: 'Turn in the 3 sentences with subjects underlined and verbs circled.',
    homeworkAssigned: 'Read Chapter 4 of The Giver and complete vocabulary log #3.',
    teacherNotes: 'Watch for Maya and Noah — encourage them to explain the difference between community rules and personal freedom.',
    completed: false,
  },
  {
    id: 'lp_7a_1',
    classId: '7A',
    grade: '7',
    title: 'Character Motivations & Active Voice in The Outsiders',
    unit: 'Unit 3: Identity & Society in The Outsiders',
    date: '2026-11-12',
    durationMinutes: 45,
    grammarFocus: 'Active vs. Passive Voice in Narrative Climax',
    objectives: [
      'Differentiate Ponyboy\'s point of view from Darry\'s protective instincts in Chapter 3',
      'Transform 4 passive sentences from text analysis into punchy active voice',
      'Synthesize theme of brotherhood vs societal division',
    ],
    materials: ['The Outsiders text', 'Character Graphic Organizers', 'Sentence Strips'],
    warmUp: 'Quick-write: What defines your identity most: your friends, your family, or your own choices? (4 mins)',
    directInstruction: 'Show two versions of Johnny\'s defense scene: passive vs active. Discuss why active voice builds dramatic tension and urgency (10 mins).',
    guidedPractice: 'Sentence surgery in trios: rewrite 5 passive passages into active tense with vivid action verbs (15 mins).',
    independentPractice: 'Draft a short dialogue between Ponyboy and Cherry Valance maintaining strong active verb choices (12 mins).',
    exitTicket: 'One-sentence summary of the chapter\'s central conflict using strictly active voice.',
    homeworkAssigned: 'Chapter 4 reading response questions #1-4 due Thursday.',
    teacherNotes: 'Caleb and Isabella have great insights into character psychology—call on them for the Socratic warm-up discussion.',
    completed: false,
  },
];

export const INITIAL_BOOKS: BookStudy[] = [
  {
    id: 'book_6',
    classId: '6A',
    title: 'The Giver',
    author: 'Lois Lowry',
    totalChapters: 23,
    currentChapter: 7,
    genre: 'Dystopian Fiction / Young Adult',
    summary: 'In a society where memories and emotions have been eliminated in favor of "Sameness", twelve-year-old Jonas is selected to become the next Receiver of Memory.',
    vocabulary: ['Apprehensive', 'Transgression', 'Aptitude', 'Chastise', 'Nurturer', 'Remorse'],
    discussionQuestions: [
      'Is a world without pain worth the sacrifice of love, color, and choice?',
      'Why does the community enforce "precision of language" so rigorously?',
      'What does the apple symbolize when Jonas first sees it change?',
    ],
    targetCompletionDate: '2026-12-15',
  },
  {
    id: 'book_7',
    classId: '7A',
    title: 'The Outsiders',
    author: 'S.E. Hinton',
    totalChapters: 12,
    currentChapter: 5,
    genre: 'Realistic / Coming-of-Age Fiction',
    summary: 'A rivalry between two social groups—the Greasers and the Socs—forces fourteen-year-old Ponyboy Curtis and his brothers to confront class inequality, loyalty, and empathy.',
    vocabulary: ['Nonchalantly', 'Incredulous', 'Gallantly', 'Aloofness', 'Contemptuous', 'Ruefully'],
    discussionQuestions: [
      'What does Cherry Valance mean when she says "things are rough all over"?',
      'How does the poem "Nothing Gold Can Stay" reflect Johnny and Ponyboy’s plight?',
      'How does S.E. Hinton use the sunsets to bridge the gap between social classes?',
    ],
    targetCompletionDate: '2026-12-18',
  },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'asg_6a_1',
    classId: '6A',
    title: 'Personal Narrative: A Moment of Change',
    description: 'A 400-500 word narrative essay recounting a meaningful personal experience, focusing on sensory details and dialogue punctuation.',
    category: 'Essay & Writing',
    dueDate: '2026-11-16',
    maxPoints: 100,
    weight: 2,
    status: 'assigned',
    createdAt: '2026-11-08',
  },
  {
    id: 'asg_6a_2',
    classId: '6A',
    title: 'Subject-Verb Concord Quick Drill',
    description: 'Interactive grammar worksheet targeting compound subjects and indefinite pronouns.',
    category: 'Grammar Exercise',
    dueDate: '2026-11-13',
    maxPoints: 20,
    weight: 1,
    status: 'grading',
    createdAt: '2026-11-09',
  },
  {
    id: 'asg_6b_1',
    classId: '6B',
    title: 'The Giver: Vocabulary & Comprehension Quiz',
    description: 'Chapters 1-5 quiz covering key terminology and dystopian elements.',
    category: 'Quiz',
    dueDate: '2026-11-14',
    maxPoints: 30,
    weight: 1,
    status: 'assigned',
    createdAt: '2026-11-07',
  },
  {
    id: 'asg_7a_1',
    classId: '7A',
    title: 'Active Voice Persuasive Letter to Mayor',
    description: 'Write a 3-paragraph persuasive letter arguing for a youth community center using at least 8 strong active voice action verbs.',
    category: 'Essay & Writing',
    dueDate: '2026-11-17',
    maxPoints: 50,
    weight: 1.5,
    status: 'assigned',
    createdAt: '2026-11-10',
  },
  {
    id: 'asg_7b_1',
    classId: '7B',
    title: 'The Outsiders: Poetry Analysis & Motif Sheet',
    description: 'Stanza by stanza deconstruction of Robert Frost’s poem within the novel.',
    category: 'Reading Log',
    dueDate: '2026-11-15',
    maxPoints: 25,
    weight: 1,
    status: 'grading',
    createdAt: '2026-11-09',
  },
];

export const INITIAL_GRADES: GradeRecord[] = (function () {
  const list: GradeRecord[] = [];
  INITIAL_STUDENTS.forEach((s) => {
    const classAsgs = INITIAL_ASSIGNMENTS.filter((a) => a.classId === s.classId || a.classId.startsWith('all'));
    classAsgs.forEach((asg) => {
      const rollInt = parseInt(s.rollNumber, 10) || 1;
      let scorePct = 0.85;
      if (rollInt % 9 === 0) scorePct = 0.65;
      else if (rollInt % 5 === 0) scorePct = 0.95;
      else if (rollInt % 3 === 0) scorePct = 0.90;
      else scorePct = 0.82;

      const score = Math.round(asg.maxPoints * scorePct);
      const st = scorePct >= 0.7 ? 'completed' : rollInt % 2 === 0 ? 'needs_revision' : 'in_progress';
      const feedback =
        scorePct >= 0.9
          ? 'Superb command of grammar mechanics and rich textual evidence.'
          : scorePct >= 0.8
          ? 'Solid performance. Watch dialogue punctuation inside quotes.'
          : 'Developing understanding. Review subject-verb concordance rules.';

      list.push({
        id: `g_${asg.id}_${s.id}`,
        assignmentId: asg.id,
        studentId: s.id,
        score,
        completionStatus: st,
        feedback,
        submitted: true,
        gradedAt: '2026-11-10',
      });
    });
  });
  return list;
})();

export const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 'rem_1',
    title: 'Grade 6A Grammar Exercise Sheets (80 Students)',
    description: 'Finalize marks for Subject-Verb Concord drill before Friday period 1.',
    dueDate: '2026-11-13',
    classId: '6A',
    priority: 'high',
    category: 'grading',
    completed: false,
  },
  {
    id: 'rem_2',
    title: 'Prepare 7B Outsiders Socratic Seminar Questions (80 Students)',
    description: 'Print discussion rubric and assign opening speakers.',
    dueDate: '2026-11-14',
    classId: '7B',
    priority: 'medium',
    category: 'lesson_prep',
    completed: false,
  },
  {
    id: 'rem_3',
    title: 'Parent-Teacher Check-in: Liam Walker (6A)',
    description: 'Discuss extra time accommodation and reading fluency progress with Sarah Walker.',
    dueDate: '2026-11-15',
    classId: '6A',
    priority: 'medium',
    category: 'parent_call',
    completed: false,
  },
  {
    id: 'rem_4',
    title: 'Grade 7 Mid-Term Exam Schedule Submission',
    description: 'Submit curriculum exam scope to department head.',
    dueDate: '2026-11-20',
    classId: '7A',
    priority: 'high',
    category: 'exam',
    completed: false,
  },
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = (function () {
  const records: AttendanceRecord[] = [];
  const classes = ['6A', '6B', '7A', '7B'];
  const dates = ['2026-11-11', '2026-11-10', '2026-11-09', '2026-11-06'];

  classes.forEach((classId) => {
    const classStudents = INITIAL_STUDENTS.filter((s) => s.classId === classId);
    dates.forEach((date, dIdx) => {
      const dailyMap: Record<string, 'P' | 'A' | 'Permitted'> = {};
      classStudents.forEach((s) => {
        const roll = parseInt(s.rollNumber, 10);
        if ((roll + dIdx) % 29 === 0) {
          dailyMap[s.id] = 'A';
        } else if ((roll + dIdx) % 17 === 0) {
          dailyMap[s.id] = 'Permitted';
        } else {
          dailyMap[s.id] = 'P';
        }
      });

      records.push({
        id: `${classId}_${date}`,
        classId,
        date,
        records: dailyMap,
        notes: dIdx === 0 ? `Roll call logged for all ${classStudents.length} students.` : undefined,
      });
    });
  });

  return records;
})();

export const INITIAL_PARTICIPATION: Record<string, number> = {
  s_6a_01: 3,
  s_6a_03: 2,
  s_6a_06: 4,
  s_6a_09: 2,
  s_7a_01: 3,
  s_7a_02: 4,
};

export const INITIAL_STUDENT_PROGRESS = [
  { studentId: 's_6a_01', exerciseId: 'g6_1', score: 100, masteryStatus: 'mastered' as const, completedDate: '2026-11-09' },
  { studentId: 's_6a_02', exerciseId: 'g6_1', score: 85, masteryStatus: 'in_progress' as const, completedDate: '2026-11-09' },
  { studentId: 's_6a_03', exerciseId: 'g6_1', score: 95, masteryStatus: 'mastered' as const, completedDate: '2026-11-09' },
  { studentId: 's_6a_04', exerciseId: 'g6_1', score: 75, masteryStatus: 'needs_support' as const, completedDate: '2026-11-09' },
  { studentId: 's_7a_01', exerciseId: 'g7_1', score: 100, masteryStatus: 'mastered' as const, completedDate: '2026-11-10' },
  { studentId: 's_7a_02', exerciseId: 'g7_1', score: 100, masteryStatus: 'mastered' as const, completedDate: '2026-11-10' },
  { studentId: 's_7a_03', exerciseId: 'g7_1', score: 80, masteryStatus: 'in_progress' as const, completedDate: '2026-11-10' },
];

export const INITIAL_MONTHLY_ASSESSMENTS: MonthlyAssessmentRecord[] = (function () {
  return INITIAL_STUDENTS.map((s) => {
    const roll = parseInt(s.rollNumber, 10);
    const exam = 75 + ((roll * 7) % 25);
    const hw = 80 + ((roll * 5) % 20);
    const oral = 3 + ((roll * 2) % 3);
    const notes =
      exam >= 90
        ? `Consistently thorough work in ${s.classId}. Great analytical contributions.`
        : exam >= 80
        ? `Engaged and attentive. Strong homework diligence.`
        : `Developing comprehension. Benefiting from small-group practice sessions.`;

    return {
      id: `${s.classId}_${s.id}_2026-11`,
      classId: s.classId,
      studentId: s.id,
      month: '2026-11',
      monthlyExamScore: exam,
      hwScore: hw,
      oralParticipationScore: oral,
      notes,
    };
  });
})();

export const INITIAL_STUDENT_LESSON_PROGRESS = [
  // 6A - lp_6a_1 (Dystopian Worldbuilding & Sameness)
  { id: 'lp_6a_1_s6a_1', lessonId: 'lp_6a_1', studentId: 's6a_1', status: 'mastered' as const, exitTicketScore: 5, exitTicketCompleted: true, notes: 'Superb grasp of Jonas memory dilemma; wrote 3 flawless descriptive sentences with compound subjects.', updatedAt: '2026-11-10' },
  { id: 'lp_6a_1_s6a_2', lessonId: 'lp_6a_1', studentId: 's6a_2', status: 'in_progress' as const, exitTicketScore: 4, exitTicketCompleted: true, notes: 'Completed the exit slip using sentence frames; benefited from extra time scaffold on reading passage.', updatedAt: '2026-11-10' },
  { id: 'lp_6a_1_s6a_3', lessonId: 'lp_6a_1', studentId: 's6a_3', status: 'mastered' as const, exitTicketScore: 5, exitTicketCompleted: true, notes: 'Contributed insightful Socratic connection between precision of language and loss of emotion.', updatedAt: '2026-11-10' },
  { id: 'lp_6a_1_s6a_4', lessonId: 'lp_6a_1', studentId: 's6a_4', status: 'needs_support' as const, exitTicketScore: 3, exitTicketCompleted: true, notes: 'Confused subject with prepositional phrase in sentence 2; provided guided practice mini-conference.', updatedAt: '2026-11-10' },
  { id: 'lp_6a_1_s6a_5', lessonId: 'lp_6a_1', studentId: 's6a_5', status: 'mastered' as const, exitTicketScore: 4, exitTicketCompleted: true, notes: 'Applied new vocabulary words effectively; great usage of visual anchor chart.', updatedAt: '2026-11-10' },
  { id: 'lp_6a_1_s6a_6', lessonId: 'lp_6a_1', studentId: 's6a_6', status: 'mastered' as const, exitTicketScore: 5, exitTicketCompleted: true, notes: 'Quick to assist peers in detecting figurative language during pair work.', updatedAt: '2026-11-10' },

  // 6B - lp_6a_1
  { id: 'lp_6a_1_s6b_1', lessonId: 'lp_6a_1', studentId: 's6b_1', status: 'mastered' as const, exitTicketScore: 5, exitTicketCompleted: true, notes: 'Thorough answers on Lowry worldbuilding motifs.', updatedAt: '2026-11-10' },
  { id: 'lp_6a_1_s6b_2', lessonId: 'lp_6a_1', studentId: 's6b_2', status: 'mastered' as const, exitTicketScore: 5, exitTicketCompleted: true, notes: 'Deeply thoughtful reflections on community rules and personal agency.', updatedAt: '2026-11-10' },
  { id: 'lp_6a_1_s6b_5', lessonId: 'lp_6a_1', studentId: 's6b_5', status: 'absent_needs_catchup' as const, exitTicketScore: 0, exitTicketCompleted: false, notes: 'Absent during lesson; need to provide reading packet & exit slip during study hall.', updatedAt: '2026-11-10' },

  // 7A - lp_7a_1 (Character Motivations & Active Voice)
  { id: 'lp_7a_1_s7a_1', lessonId: 'lp_7a_1', studentId: 's7a_1', status: 'mastered' as const, exitTicketScore: 5, exitTicketCompleted: true, notes: 'Transformed all passive sentences into punchy active narrative lines.', updatedAt: '2026-11-10' },
  { id: 'lp_7a_1_s7a_2', lessonId: 'lp_7a_1', studentId: 's7a_2', status: 'mastered' as const, exitTicketScore: 5, exitTicketCompleted: true, notes: 'Exceptional literary insight into Ponyboy Curtis internal struggle.', updatedAt: '2026-11-10' },
  { id: 'lp_7a_1_s7a_3', lessonId: 'lp_7a_1', studentId: 's7a_3', status: 'in_progress' as const, exitTicketScore: 4, exitTicketCompleted: true, notes: 'Understands subject-verb action; continuing to refine past perfect verbs.', updatedAt: '2026-11-10' },

  // 7B - lp_7a_1
  { id: 'lp_7a_1_s7b_1', lessonId: 'lp_7a_1', studentId: 's7b_1', status: 'mastered' as const, exitTicketScore: 5, exitTicketCompleted: true, notes: 'Strong active verb selections in dialogue rewrite exercise.', updatedAt: '2026-11-10' },
  { id: 'lp_7a_1_s7b_2', lessonId: 'lp_7a_1', studentId: 's7b_2', status: 'mastered' as const, exitTicketScore: 5, exitTicketCompleted: true, notes: 'Engaged discussion leader during Socratic seminar.', updatedAt: '2026-11-10' },
];

export const INITIAL_CUMULATIVE_PROGRESS = [
  // 6A
  { id: 's6a_1', studentId: 's6a_1', strengths: 'Grammar analysis, essay structure, vocal clarity', growthAreas: 'Creative metaphors in poetry', generalNotes: 'Maya is a cornerstone student in 6A. Always prompt, highly reflective, and submits pristine homework on time.', targetGoals: 'Submit personal narrative essay draft with 5 distinct dialogue conventions by Nov 16.', updatedAt: '2026-11-10' },
  { id: 's6a_2', studentId: 's6a_2', strengths: 'Enthusiastic participant, diligent revisions', growthAreas: 'Reading pacing, complex compound subjects', generalNotes: 'Liam responds very positively to individualized check-ins. His focus and reading endurance have noticeably improved this quarter.', targetGoals: 'Practice daily 15-minute silent reading logs and highlight subject nouns.', updatedAt: '2026-11-10' },
  { id: 's6a_3', studentId: 's6a_3', strengths: 'Critical thinking, thematic synthesis, spelling', growthAreas: 'Punctuation inside quotation marks', generalNotes: 'Aaliyah provides thoughtful cultural and philosophical perspectives during novel discussions.', targetGoals: 'Incorporate transition words in persuasive body paragraphs.', updatedAt: '2026-11-10' },
  { id: 's6a_4', studentId: 's6a_4', strengths: 'Verbal storytelling, peer empathy', growthAreas: 'Subject-verb agreement when words intervene', generalNotes: 'Noah is energetic and attentive. Benefited greatly from grammar manipulatives.', targetGoals: 'Complete grammar error correction drill with 80%+ accuracy.', updatedAt: '2026-11-10' },

  // 6B
  { id: 's6b_1', studentId: 's6b_1', strengths: 'Structured outlining, vocabulary acquisition', growthAreas: 'Expressive descriptive adjectives', generalNotes: 'Benjamin demonstrates steady, methodical academic habits across all ELA modules.', targetGoals: 'Expand sensory vocabulary bank for narrative writing.', updatedAt: '2026-11-10' },
  { id: 's6b_2', studentId: 's6b_2', strengths: 'Deep textual comprehension, empathetic analysis', growthAreas: 'Time management during timed quizzes', generalNotes: 'Sophia writes with poetic sensitivity and understands nuanced character motives.', targetGoals: 'Outline essays in 5 minutes before drafting.', updatedAt: '2026-11-10' },

  // 7A
  { id: 's7a_1', studentId: 's7a_1', strengths: 'Active voice syntax, persuasive rhetoric, debate', growthAreas: 'Semicolon and dash punctuation mechanics', generalNotes: 'Caleb produces compelling persuasive writing with natural stylistic flair.', targetGoals: 'Master semicolon placement between independent clauses.', updatedAt: '2026-11-10' },
  { id: 's7a_2', studentId: 's7a_2', strengths: 'Textual evidence citation, motif tracking', growthAreas: 'Concise thesis statement formulation', generalNotes: 'Isabella exhibits exemplary analytical maturity for 7th grade.', targetGoals: 'Draft two-part thesis statement for Outsiders research paper.', updatedAt: '2026-11-10' },

  // 7B
  { id: 's7b_1', studentId: 's7b_1', strengths: 'Narrative pacing, dialogue tags, active reading', growthAreas: 'Avoiding run-on sentences in climax scenes', generalNotes: 'Nathaniel is deeply invested in theGreaser vs Soc social dynamics unit.', targetGoals: 'Eliminate comma splices using coordinating conjunctions.', updatedAt: '2026-11-10' },
];

/**
 * Creates default seed database for the teacher
 */
export function getDefaultDatabase(): AppDatabase {
  return {
    classes: INITIAL_CLASSES,
    students: INITIAL_STUDENTS,
    attendance: INITIAL_ATTENDANCE,
    assignments: INITIAL_ASSIGNMENTS,
    grades: INITIAL_GRADES,
    participation: [
      {
        id: 'part_today',
        classId: '6A',
        date: '2026-11-11',
        scores: INITIAL_PARTICIPATION,
        logs: [
          { id: 'p1', studentId: 's6a_1', delta: 1, reason: 'Volunteered to read Jonas dialogue aloud', timestamp: Date.now() - 3600000 },
          { id: 'p2', studentId: 's6a_6', delta: 2, reason: 'Identified accurate prepositional phrase error', timestamp: Date.now() - 1800000 },
        ],
      },
    ],
    lessonPlans: INITIAL_LESSON_PLANS,
    grammarExercises: INITIAL_GRAMMAR_EXERCISES,
    studentProgress: INITIAL_STUDENT_PROGRESS,
    books: INITIAL_BOOKS,
    encryptedNotes: [],
    teacherNotes: [],
    reminders: INITIAL_REMINDERS,
    monthlyAssessments: INITIAL_MONTHLY_ASSESSMENTS,
    studentLessonProgress: INITIAL_STUDENT_LESSON_PROGRESS,
    cumulativeProgress: INITIAL_CUMULATIVE_PROGRESS,
    settings: {
      teacherName: 'English Department',
      activeAcademicYear: '2026-2027',
      activeClassId: '6A',
      isDarkMode: true,
      cloudSyncKey: 'teacher_vault_' + Math.random().toString(36).substring(2, 9),
      notificationEnabled: true,
    },
    academicYears: ['2026-2027', '2025-2026', '2027-2028'],
  };
}

/**
 * Storage API with offline-first persistence
 */
export const StorageService = {
  load(): AppDatabase {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const s6a = (parsed.students || []).filter((s: Student) => s.classId === '6A');

        // If stored data has fewer than 60 students in 6A (i.e. legacy seed), upgrade to full 80-students-per-class database
        if (s6a.length < 60) {
          const fullDef = getDefaultDatabase();
          parsed.students = fullDef.students;
          parsed.classes = fullDef.classes;
          parsed.attendance = fullDef.attendance;
          parsed.grades = fullDef.grades;
          parsed.monthlyAssessments = fullDef.monthlyAssessments;
          parsed.teacherNotes = parsed.teacherNotes || [];
          this.save(parsed);
          return parsed;
        }

        return {
          ...getDefaultDatabase(),
          ...parsed,
          teacherNotes: parsed.teacherNotes || [],
          studentLessonProgress: parsed.studentLessonProgress || getDefaultDatabase().studentLessonProgress,
          cumulativeProgress: parsed.cumulativeProgress || getDefaultDatabase().cumulativeProgress,
          monthlyAssessments: parsed.monthlyAssessments || getDefaultDatabase().monthlyAssessments,
          settings: {
            ...getDefaultDatabase().settings,
            ...(parsed.settings || {}),
          },
        };
      }
    } catch (e) {
      console.warn('Failed to parse stored database, loading default seed:', e);
    }
    const def = getDefaultDatabase();
    this.save(def);
    return def;
  },

  save(db: AppDatabase): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  /**
   * Generates a downloadable JSON file for offline backup
   */
  exportJsonBackup(db: AppDatabase): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `GradeCraft_Teacher_Backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  /**
   * Imports backup data
   */
  async importJsonBackup(file: File): Promise<AppDatabase> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (!parsed.classes || !parsed.students) {
            throw new Error('Invalid GradeCraft backup file format.');
          }
          this.save(parsed);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read backup file.'));
      reader.readAsText(file);
    });
  },

  /**
   * Cloud sync helper (posts snapshot to /api/cloud/backup)
   */
  async syncToCloud(db: AppDatabase, syncKey: string): Promise<{ success: boolean; syncedAt?: string; error?: string }> {
    try {
      const res = await fetch('/api/cloud/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncKey, payload: db }),
      });
      if (!res.ok) throw new Error('Cloud sync request failed');
      const data = await res.json();
      return { success: true, syncedAt: data.syncedAt };
    } catch (err: any) {
      console.warn('Offline or cloud sync error:', err);
      return { success: false, error: err.message || 'Offline: cloud sync deferred' };
    }
  },

  /**
   * Restores from cloud backup endpoint
   */
  async restoreFromCloud(syncKey: string): Promise<AppDatabase | null> {
    try {
      const res = await fetch(`/api/cloud/backup?syncKey=${encodeURIComponent(syncKey)}`);
      if (!res.ok) throw new Error('Could not find cloud backup for key');
      const data = await res.json();
      if (data.success && data.data) {
        this.save(data.data);
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to restore from cloud:', err);
      throw err;
    }
  },

  /**
   * Generates a realistic large roster (e.g. 80-90 students) with authentic middle school
   * ELA student names, sequential roll numbers (01 to N), guardian contacts, and accommodations.
   */
  generateRealisticLargeRoster(classId: string, count: number = 85): Student[] {
    const firstNames = [
      'Maya', 'Liam', 'Aaliyah', 'Noah', 'Chloe', 'Ethan', 'Grace', 'Lucas', 'Zoe', 'Daniel',
      'Benjamin', 'Sophia', 'Mason', 'Emma', 'Alexander', 'Mia', 'Oliver', 'Amelia', 'Caleb', 'Isabella',
      'Jackson', 'Hannah', 'Samuel', 'Lily', 'Gabriel', 'Victoria', 'Elijah', 'Nathaniel', 'Ava', 'Wyatt',
      'Penelope', 'Henry', 'Scarlett', 'Julian', 'Hazel', 'Sebastian', 'Aria', 'Leo', 'Nora', 'Owen',
      'Elena', 'Jack', 'Layla', 'Luke', 'Ellie', 'Jayden', 'Audrey', 'Levi', 'Bella', 'Isaac',
      'Claire', 'Mateo', 'Skylar', 'Lincoln', 'Lucy', 'Jaxon', 'Paisley', 'Asher', 'Everly', 'Theodore',
      'Anna', 'Josiah', 'Caroline', 'Andrew', 'Nova', 'Thomas', 'Genesis', 'Joshua', 'Emilia', 'Ezra',
      'Kennedy', 'Hudson', 'Samantha', 'Charles', 'Maya', 'Christian', 'Willow', 'Jonathan', 'Kinsley', 'Jaden',
      'Naomi', 'Dominic', 'Aaliyah', 'Aaron', 'Elena', 'Adam', 'Sarah', 'Anthony', 'Allison', 'Ian',
      'Gabriella', 'Miles', 'Alice', 'Adrian', 'Madelyn', 'Eli', 'Cora', 'Nolan', 'Ruby', 'Colton'
    ];

    const lastNames = [
      'Walker', 'Khan', 'Dubois', 'Hernandez', 'Kim', 'O\'Connor', 'Patel', 'Rossi', 'Washington', 'Lin',
      'Adams', 'Chen', 'Evans', 'Garcia', 'Tanaka', 'Wright', 'Scott', 'Taylor', 'Morgan', 'Vance',
      'Reed', 'Morales', 'Brooks', 'Zhang', 'Santos', 'Price', 'Foster', 'Cooper', 'Mitchell', 'Turner',
      'Ward', 'Diaz', 'Bailey', 'Rivera', 'Hughes', 'Bennett', 'Gomez', 'Sullivan', 'Alvarez', 'Fischer',
      'Peterson', 'Mendoza', 'Jenkins', 'Reyes', 'Coleman', 'Castillo', 'Hopkins', 'Ramirez', 'Simmons', 'Flores',
      'Graham', 'Gupta', 'Nguyen', 'Ibrahim', 'Okafor', 'Takahashi', 'Larsson', 'Müller', 'Novak', 'Moreau',
      'Silva', 'Kowalski', 'Kovacs', 'Costa', 'Sato', 'Nakamura', 'Hassan', 'Farah', 'Mensah', 'Diallo',
      'Sinclair', 'Donovan', 'Harrington', 'Chambers', 'Gallagher', 'Whitaker', 'Mercer', 'Vaughn', 'Hensley', 'Bradford',
      'Montgomery', 'Callahan', 'Navarro', 'Delgado', 'Valencia', 'Espinoza', 'Villanueva', 'Cervantes', 'Solano', 'Montes'
    ];

    const avatarColors = [
      '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4',
      '#f97316', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16', '#a855f7'
    ];

    const possibleAccommodations = [
      'Extra 15 mins on reading passages & quizzes',
      'Visual vocabulary scaffold & graphic organizers',
      'Prefers front row seating for board focus',
      'Audiobook companion support during novel study',
      'Chunked multi-step writing instructions',
      'Speech-to-text option for essay drafting',
      'Highlighter allowed on printed prompts',
    ];

    const result: Student[] = [];

    for (let i = 1; i <= count; i++) {
      const fName = firstNames[(i - 1) % firstNames.length];
      const lName = lastNames[((i * 3) - 1) % lastNames.length];
      const fullName = `${fName} ${lName}`;
      const rollNumber = String(i).padStart(2, '0');
      const studentId = `s_${classId.toLowerCase()}_${rollNumber}`;
      const hasAccom = i % 8 === 0 || i % 13 === 0;
      const accomText = hasAccom ? possibleAccommodations[i % possibleAccommodations.length] : undefined;

      result.push({
        id: studentId,
        classId,
        name: fullName,
        rollNumber,
        guardianName: `Parent of ${fName}`,
        guardianContact: `${fName.toLowerCase()}.${lName.toLowerCase()}@parent-mail.com`,
        accommodations: accomText,
        avatarColor: avatarColors[i % avatarColors.length],
      });
    }

    return result;
  },
};

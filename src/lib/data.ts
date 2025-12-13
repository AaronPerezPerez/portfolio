export const personalInfo = {
  name: "Aarón Pérez Pérez",
  title: "Software Craftsman",
  subtitle: "Full-Stack Developer | 6+ Years Experience",
  location: "Tenerife, Canary Islands, Spain",
  email: "aarperper@gmail.com",
  website: "https://aaronperez.me",
  bio: "Dedicated Software Engineer with 6+ years building robust and scalable systems through clean code, hexagonal architecture, and agile methodologies. Passionate about software craftsmanship, emphasizing that quality code results from developer dedication rather than mechanical rule-following.",
  social: {
    linkedin: "https://www.linkedin.com/in/aarperper/",
    github: "https://github.com/AaronPerezPerez",
    twitter: "https://twitter.com/molotroco94",
  },
} as const;

export const experiences = [
  {
    id: 1,
    company: "beonit",
    role: "FullStack Developer",
    location: "Madrid, Spain (Remote)",
    startDate: "November 2024",
    endDate: "Present",
    current: true,
    duration: undefined,
    description: "Building modern full-stack solutions with focus on scalability and clean architecture.",
    technologies: ["TypeScript", "React", "NestJS", "PostgreSQL"],
  },
  {
    id: 2,
    company: "Freelance",
    role: "Senior Software Craftsman",
    location: "Remote",
    startDate: "March 2024",
    endDate: "November 2024",
    current: false,
    duration: "9 months",
    description: "Independent consulting focusing on software architecture, clean code practices, and mentoring development teams.",
    technologies: ["TypeScript", "Node.js", "DDD", "TDD", "Hexagonal Architecture"],
  },
  {
    id: 3,
    company: "Codurance",
    role: "Senior Software Craftsman",
    location: "Barcelona, Spain (Remote)",
    startDate: "April 2023",
    endDate: "December 2024",
    current: false,
    duration: "1 year 9 months",
    description: "Delivered high-quality software solutions emphasizing Test-Driven Development, Domain-Driven Design, and Hexagonal Architecture. Mentored teams on software craftsmanship principles.",
    technologies: ["TypeScript", "NestJS", "GraphQL", "MongoDB", "PostgreSQL", "TDD", "DDD"],
  },
  {
    id: 4,
    company: "Swan",
    role: "Software Engineer",
    location: "Paris, France (Remote)",
    startDate: "September 2022",
    endDate: "March 2023",
    current: false,
    duration: "7 months",
    description: "Contributed to banking-as-a-service platform development with focus on backend services and microservices architecture.",
    technologies: ["TypeScript", "Node.js", "Microservices", "AWS", "Docker"],
  },
  {
    id: 5,
    company: "Acid Tango",
    role: "Full Stack Developer",
    location: "Tenerife, Canary Islands, Spain",
    startDate: "November 2019",
    endDate: "September 2022",
    current: false,
    duration: "2 years 11 months",
    description: "Developed full-stack applications from concept to deployment. Gained comprehensive experience in modern web technologies and agile development practices.",
    technologies: ["JavaScript", "TypeScript", "React", "Node.js", "Express", "MongoDB"],
  },
] as const;

export const projects = [
  {
    id: 1,
    name: "NestJS Contributions",
    description: "Contributing to the popular Node.js framework for building scalable server-side applications",
    technologies: ["TypeScript", "Node.js", "NestJS"],
    github: "https://github.com/nestjs/nest",
    stars: 0, // Not showing repo stars, showing contribution badge instead
    contributionType: "documentation" as const,
    featured: true,
  },
  {
    id: 2,
    name: "Arcus Python",
    description: "Python client library for Arcus caching system",
    technologies: ["Python", "Caching"],
    github: "https://github.com/AaronPerezPerez/arcus-python",
    stars: 5,
    featured: true,
  },
  {
    id: 3,
    name: "Tepper",
    description: "TypeScript HTTP testing library for modern applications",
    technologies: ["TypeScript", "Testing", "HTTP"],
    github: "https://github.com/AaronPerezPerez/tepper",
    stars: 3,
    featured: true,
  },
  {
    id: 4,
    name: "GitHub Stats",
    description: "Dynamic README stats generator for GitHub profiles",
    technologies: ["JavaScript", "GitHub API"],
    github: "https://github.com/AaronPerezPerez/github-readme-stats",
    stars: 67800,
    featured: false,
  },
] as const;

export const skills = {
  languages: [
    { name: "TypeScript", level: "expert" },
    { name: "JavaScript", level: "expert" },
    { name: "Rust", level: "intermediate" },
    { name: "Python", level: "intermediate" },
    { name: "Bash", level: "intermediate" },
  ],
  backend: [
    { name: "NestJS", level: "expert" },
    { name: "Node.js", level: "expert" },
    { name: "Express.js", level: "expert" },
    { name: "GraphQL", level: "advanced" },
    { name: "REST APIs", level: "expert" },
  ],
  frontend: [
    { name: "React", level: "advanced" },
    { name: "Next.js", level: "advanced" },
    { name: "Tailwind CSS", level: "advanced" },
  ],
  databases: [
    { name: "PostgreSQL", level: "advanced" },
    { name: "MongoDB", level: "advanced" },
  ],
  devops: [
    { name: "Docker", level: "advanced" },
    { name: "AWS", level: "intermediate" },
    { name: "Git", level: "expert" },
  ],
  architecture: [
    { name: "Hexagonal Architecture", level: "expert" },
    { name: "Domain-Driven Design", level: "expert" },
    { name: "Test-Driven Development", level: "expert" },
    { name: "Microservices", level: "advanced" },
    { name: "Clean Code", level: "expert" },
    { name: "Design Patterns", level: "expert" },
  ],
} as const;

export const achievements = [
  "Arctic Code Vault Contributor",
  "GitHub Pull Shark x3",
  "Pair Extraordinaire",
  "Quickdraw",
] as const;

export const stats = {
  yearsOfExperience: 6,
  githubRepos: 22,
  githubFollowers: 49,
  linkedinConnections: "500+",
  linkedinFollowers: 896,
} as const;

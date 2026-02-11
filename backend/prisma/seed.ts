import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Clearing existing data...');
  await prisma.userSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillCategory.deleteMany();

  // Create Skill Categories
  console.log('📚 Creating skill categories...');
  const categories = await Promise.all([
    prisma.skillCategory.create({
      data: {
        name: 'Programming & Development',
        description: 'Software development, web development, mobile apps, and programming languages',
        icon: '💻',
      },
    }),
    prisma.skillCategory.create({
      data: {
        name: 'Design & Creative',
        description: 'Graphic design, UI/UX, video editing, and creative arts',
        icon: '🎨',
      },
    }),
    prisma.skillCategory.create({
      data: {
        name: 'Business & Marketing',
        description: 'Digital marketing, business strategy, sales, and entrepreneurship',
        icon: '📈',
      },
    }),
    prisma.skillCategory.create({
      data: {
        name: 'Languages',
        description: 'Spoken languages, regional dialects, and communication',
        icon: '🗣️',
      },
    }),
    prisma.skillCategory.create({
      data: {
        name: 'Music & Arts',
        description: 'Musical instruments, singing, dancing, and performing arts',
        icon: '🎵',
      },
    }),
    prisma.skillCategory.create({
      data: {
        name: 'Fitness & Sports',
        description: 'Yoga, gym training, sports, and physical wellness',
        icon: '💪',
      },
    }),
    prisma.skillCategory.create({
      data: {
        name: 'Cooking & Culinary',
        description: 'Cooking, baking, regional cuisines, and food preparation',
        icon: '👨‍🍳',
      },
    }),
    prisma.skillCategory.create({
      data: {
        name: 'Education & Teaching',
        description: 'Academic subjects, tutoring, and educational skills',
        icon: '📖',
      },
    }),
    prisma.skillCategory.create({
      data: {
        name: 'Technology & IT',
        description: 'IT support, networking, cloud computing, and technical skills',
        icon: '⚙️',
      },
    }),
    prisma.skillCategory.create({
      data: {
        name: 'Photography & Videography',
        description: 'Photography, video production, and visual storytelling',
        icon: '📷',
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Create Skills for each category
  console.log('🎯 Creating skills...');

  // Programming & Development
  await createSkills(categories[0].categoryId, [
    { name: 'Python Programming', description: 'Learn Python for web dev, data science, and automation' },
    { name: 'JavaScript & React', description: 'Modern web development with React and JavaScript' },
    { name: 'Node.js Backend', description: 'Build scalable backend applications with Node.js' },
    { name: 'Java Programming', description: 'Enterprise Java development and Spring framework' },
    { name: 'Mobile App Development', description: 'Android, iOS, or React Native mobile development' },
    { name: 'HTML & CSS', description: 'Web design fundamentals and responsive layouts' },
    { name: 'SQL & Databases', description: 'Database design, queries, and optimization' },
    { name: 'Git & Version Control', description: 'Source code management and collaboration' },
  ]);

  // Design & Creative
  await createSkills(categories[1].categoryId, [
    { name: 'Graphic Design', description: 'Logo design, branding, and visual identity' },
    { name: 'UI/UX Design', description: 'User interface and user experience design' },
    { name: 'Figma', description: 'Design and prototyping with Figma' },
    { name: 'Adobe Photoshop', description: 'Photo editing and digital art' },
    { name: 'Video Editing', description: 'Premier Pro, Final Cut, or DaVinci Resolve' },
    { name: 'Animation', description: '2D/3D animation and motion graphics' },
    { name: 'Illustration', description: 'Digital and traditional illustration' },
  ]);

  // Business & Marketing
  await createSkills(categories[2].categoryId, [
    { name: 'Digital Marketing', description: 'SEO, SEM, social media, and content marketing' },
    { name: 'Social Media Management', description: 'Instagram, Facebook, LinkedIn strategy' },
    { name: 'Content Writing', description: 'Blog writing, copywriting, and storytelling' },
    { name: 'Business Strategy', description: 'Business planning and strategic thinking' },
    { name: 'Sales & Negotiation', description: 'Sales techniques and negotiation skills' },
    { name: 'Email Marketing', description: 'Email campaigns and marketing automation' },
  ]);

  // Languages
  await createSkills(categories[3].categoryId, [
    { name: 'English Speaking', description: 'Conversational English and communication' },
    { name: 'Hindi', description: 'Hindi language and communication' },
    { name: 'Tamil', description: 'Tamil language and literature' },
    { name: 'Telugu', description: 'Telugu language and communication' },
    { name: 'Spanish', description: 'Spanish language learning' },
    { name: 'German', description: 'German language for beginners and advanced' },
    { name: 'French', description: 'French language and culture' },
  ]);

  // Music & Arts
  await createSkills(categories[4].categoryId, [
    { name: 'Guitar', description: 'Acoustic and electric guitar lessons' },
    { name: 'Piano/Keyboard', description: 'Piano and keyboard playing' },
    { name: 'Singing', description: 'Vocal training and singing techniques' },
    { name: 'Classical Dance', description: 'Bharatanatyam, Kathak, or other classical forms' },
    { name: 'Tabla', description: 'Indian percussion instrument' },
    { name: 'Painting', description: 'Oil painting, watercolor, or acrylic' },
  ]);

  // Fitness & Sports
  await createSkills(categories[5].categoryId, [
    { name: 'Yoga', description: 'Hatha, Vinyasa, or Ashtanga yoga practice' },
    { name: 'Gym Training', description: 'Strength training and fitness coaching' },
    { name: 'Cricket Coaching', description: 'Cricket techniques and strategies' },
    { name: 'Football', description: 'Football skills and training' },
    { name: 'Running & Marathon', description: 'Running techniques and marathon preparation' },
    { name: 'Meditation', description: 'Mindfulness and meditation practices' },
  ]);

  // Cooking & Culinary
  await createSkills(categories[6].categoryId, [
    { name: 'North Indian Cuisine', description: 'Punjabi, Mughlai, and North Indian cooking' },
    { name: 'South Indian Cuisine', description: 'Dosa, idli, sambar, and South Indian dishes' },
    { name: 'Baking', description: 'Cakes, pastries, and bread baking' },
    { name: 'Continental Cooking', description: 'Western and continental cuisine' },
    { name: 'Chinese Cooking', description: 'Indo-Chinese and authentic Chinese dishes' },
    { name: 'Desserts & Sweets', description: 'Indian sweets and international desserts' },
  ]);

  // Education & Teaching
  await createSkills(categories[7].categoryId, [
    { name: 'Mathematics', description: 'Math tutoring for school and competitive exams' },
    { name: 'Physics', description: 'Physics concepts and problem-solving' },
    { name: 'Chemistry', description: 'Chemistry fundamentals and practical knowledge' },
    { name: 'Biology', description: 'Life sciences and biology education' },
    { name: 'Competitive Exam Prep', description: 'JEE, NEET, CAT, UPSC preparation' },
  ]);

  // Technology & IT
  await createSkills(categories[8].categoryId, [
    { name: 'Computer Basics', description: 'Basic computer skills and MS Office' },
    { name: 'Excel & Data Analysis', description: 'Advanced Excel and data analytics' },
    { name: 'Cloud Computing', description: 'AWS, Azure, or Google Cloud Platform' },
    { name: 'Cybersecurity', description: 'Security fundamentals and ethical hacking' },
    { name: 'DevOps', description: 'CI/CD, Docker, Kubernetes, and automation' },
  ]);

  // Photography & Videography
  await createSkills(categories[9].categoryId, [
    { name: 'Photography Basics', description: 'Camera settings, composition, and lighting' },
    { name: 'Portrait Photography', description: 'Portrait and people photography' },
    { name: 'Product Photography', description: 'E-commerce and product photography' },
    { name: 'Video Production', description: 'Video shooting and production techniques' },
    { name: 'Drone Photography', description: 'Aerial photography and videography' },
  ]);

  console.log('✅ Skills created successfully');

  // Create sample badges
  console.log('🏆 Creating badges...');
  await Promise.all([
    prisma.badge.create({
      data: {
        name: 'First Swap',
        description: 'Complete your first skill swap',
        icon: '🎉',
        criteria: 'SWAP_COUNT',
        threshold: 1,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Early Adopter',
        description: 'Join the tej-india community in the first month',
        icon: '🚀',
        criteria: 'REGISTRATION_DATE',
        threshold: 30,
      },
    }),
    prisma.badge.create({
      data: {
        name: '5-Star Teacher',
        description: 'Maintain 5-star rating with at least 10 reviews',
        icon: '⭐',
        criteria: 'RATING',
        threshold: 5,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Skill Master',
        description: 'Complete 50 skill swaps',
        icon: '🎓',
        criteria: 'SWAP_COUNT',
        threshold: 50,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Community Helper',
        description: 'Help 100 people learn new skills',
        icon: '🤝',
        criteria: 'STUDENTS_TAUGHT',
        threshold: 100,
      },
    }),
  ]);

  console.log('✅ Badges created successfully');
  console.log('🎉 Database seed completed!');
}

async function createSkills(categoryId: string, skills: { name: string; description: string }[]) {
  for (const skill of skills) {
    await prisma.skill.create({
      data: {
        categoryId,
        name: skill.name,
        description: skill.description,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

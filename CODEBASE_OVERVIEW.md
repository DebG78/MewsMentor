# SkillPoint - Codebase Overview

## 🎯 **Project Description**
SkillPoint is a skills-focused internal mentoring platform with AI-powered matching, structured sprints, and measurable outcomes for enterprise teams. The platform enables mentees and mentors to connect through comprehensive surveys, provides admin management tools, and includes a complete user authentication flow.

## 🏗️ **Architecture Overview**

### **Tech Stack**
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Routing**: React Router v6
- **State Management**: React Context API
- **Database**: Supabase (PostgreSQL)
- **Build Tool**: Vite
- **Authentication**: Custom localStorage-based system

### **Project Structure**
```
src/
├── components/          # Reusable UI components
├── contexts/           # React Context providers
├── hooks/             # Custom React hooks
├── lib/               # Utilities and services
├── pages/             # Route components
├── types/             # TypeScript type definitions
└── main.tsx           # Application entry point
```

## 📁 **Key Directories & Files**

### **🎨 Components (`src/components/`)**
- **`Layout.tsx`** - Main layout wrapper with conditional navigation
- **`ProtectedRoute.tsx`** - Route guards for authentication
- **`HoldingArea.tsx`** - Admin interface for unassigned signups
- **`CohortManagement.tsx`** - Admin cohort creation and management
- **`MatchingInterface.tsx`** - AI-powered mentor-mentee matching
- **`DataImport.tsx`** - CSV file upload and processing
- **UI Components** - Shadcn/ui component library

### **🧠 Context (`src/contexts/`)**
- **`UserContext.tsx`** - User authentication and profile state management
  - Handles mentee/mentor/admin user types
  - localStorage-based session persistence
  - Profile completion detection via Supabase

### **🔧 Services (`src/lib/`)**
- **`supabase.ts`** - Supabase client configuration
- **`supabaseService.ts`** - Database CRUD operations
  - Signup functions for mentees/mentors
  - Cohort management operations
  - Unassigned user handling
- **`cohortManager.ts`** - Re-exports for backward compatibility

### **📄 Pages (`src/pages/`)**
- **`LandingPage.tsx`** - Public marketing page with signup CTAs
- **`Dashboard.tsx`** - Personalized dashboard for authenticated users
- **`AdminDashboard.tsx`** - Admin control panel with tabs
- **`AdminLogin.tsx`** - Admin authentication page
- **`MenteeSignup.tsx`** - 5-step mentee registration form
- **`MentorSignup.tsx`** - 5-step mentor registration form
- **`Skills.tsx`** - Skills catalog and mentor matching
- **`MentoringWorkspace.tsx`** - Active mentoring session interface

### **📊 Types (`src/types/`)**
- **`database.ts`** - Supabase-generated database types
- **`mentoring.ts`** - Application-specific type definitions

## 🔄 **User Flow Architecture**

### **Authentication States**
1. **Unauthenticated** → Landing page with signup CTAs
2. **Mentee/Mentor** → Full dashboard with personalized content
3. **Admin** → Admin dashboard with management tools

### **Route Protection**
- **PublicRoute** - Redirects authenticated users to dashboard
- **ProtectedRoute** - Requires authentication, redirects to landing
- **Layout Wrapper** - Provides consistent navigation based on user type

## 🗄️ **Database Schema**

### **Core Tables**
- **`cohorts`** - Mentorship program cohorts
- **`mentees`** - Mentee profiles with comprehensive survey data
- **`mentors`** - Mentor profiles with experience and preferences
- **`matches`** - AI-generated mentor-mentee pairings

### **Key Features**
- **Unassigned Handling** - `cohort_id: 'unassigned'` for holding area
- **Comprehensive Surveys** - 40+ fields for matching precision
- **Flexible Cohort System** - Multiple cohorts with status management

## 🎨 **UI/UX Design**

### **Design System**
- **Color Scheme** - Tailwind CSS with custom gradients
- **Typography** - Consistent heading and text hierarchy
- **Components** - Shadcn/ui for consistent styling
- **Responsive** - Mobile-first design approach

### **Key UX Principles**
- **Progressive Disclosure** - Features revealed after profile completion
- **Clean Separation** - Landing vs authenticated app experience
- **User-Centric** - Personalized content based on user type
- **Admin-Focused** - Separate admin interface for management

## 🚀 **Key Features**

### **✅ Completed Features**

#### **Phase 1: Data Import & Management**
- Excel/CSV import with drag-and-drop
- Data validation and parsing
- User profile display and editing
- Structured data storage

#### **Phase 2: AI Matching Engine**
- Hard filters (language, timezone, capacity)
- Feature scoring (topics, industry, role fit)
- Batch and Top3 matching modes
- Tie-breaking logic implementation

#### **Phase 3: Admin Program Management**
- Cohort creation and management
- Match review and approval system
- Capacity tracking dashboard
- Data import integration

#### **Phase 3.5: Backend Integration**
- Supabase setup and configuration
- Database schema and types
- Service layer for CRUD operations
- Async data loading with error handling

#### **Phase 4: User Experience & Communication**
- **Comprehensive Signup System**
  - 5-step mentee/mentor registration
  - 40+ survey questions for precise matching
  - Cohort selection or admin assignment
  - Database integration with full survey data

- **Admin Holding Area**
  - Unassigned signups management
  - Detailed profile review interface
  - Cohort assignment functionality
  - Real-time status updates

- **Complete Authentication Flow**
  - User context and state management
  - Route protection and guards
  - Progressive feature disclosure
  - Admin bypass credentials (admin/admin123)

- **Landing Page Optimization**
  - Clean marketing-focused design
  - Removed skills preview for focus
  - Single clear CTA flow
  - App rebranding to SkillPoint

### **🔄 Current Workflow**

#### **For Mentees/Mentors:**
1. Visit landing page → Click signup CTA
2. Complete 5-step registration form
3. Choose existing cohort or admin assignment
4. Profile created → Session established → Redirect to dashboard
5. Access full platform features

#### **For Admins:**
1. Click "Sign In" → Admin login page
2. Enter credentials (admin/admin123)
3. Access admin dashboard with:
   - Cohort management
   - Unassigned signups (holding area)
   - Match review and approval
   - Data import capabilities

## 🔧 **Development Setup**

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Supabase account and project

### **Environment Variables**
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Development Commands**
```bash
npm install          # Install dependencies
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
```

### **Admin Access**
- **URL**: `/admin/login`
- **Username**: `admin`
- **Password**: `admin123`

## 📈 **Future Enhancements**

### **Immediate Next Steps**
- Match notification system
- Session management and scheduling
- Slack integration for notifications
- Enhanced matching analytics

### **Long-term Goals**
- Real-time features with Supabase subscriptions
- Production-ready authentication
- Advanced reporting dashboard
- Mobile app development

## 🏷️ **Version History**
- **v1.0** - Initial platform with CSV import and matching
- **v2.0** - Admin dashboard and cohort management
- **v3.0** - Complete user signup and authentication system
- **v3.1** - Landing page optimization and admin login

---

*Last Updated: December 2024*
*Platform: SkillPoint - Skills-Focused Internal Mentoring*
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Target,
  BookOpen,
  Calendar,
  User,
  Shield,
  LogOut,
  Moon,
  Sun,
  Settings,
  TrendingUp
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GrowthSidebar } from "@/components/growth/GrowthSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, userProfile, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Update admin mode state based on current location
  useEffect(() => {
    setIsAdminMode(location.pathname.startsWith('/admin'));
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleAdminToggle = (checked: boolean) => {
    setIsAdminMode(checked);
    if (checked) {
      navigate('/admin');
    } else {
      navigate('/growth');
    }
  };

  // Determine if sidebar should be shown
  const showSidebar = isAuthenticated && !isAdminMode;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1
              className="text-xl font-bold text-foreground cursor-pointer"
              onClick={() => navigate(isAuthenticated ? '/growth' : '/')}
            >
              SkillPoint
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              // Authenticated Navigation
              <>
                {userProfile?.type === 'admin' ? (
                  <>
                    <div className="flex items-center space-x-3 px-3 py-2 bg-muted/50 rounded-lg">
                      <Label htmlFor="admin-mode" className="text-sm font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        User Experience
                      </Label>
                      <Switch
                        id="admin-mode"
                        checked={isAdminMode}
                        onCheckedChange={handleAdminToggle}
                      />
                      <Label htmlFor="admin-mode" className="text-sm font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </Label>
                    </div>
                  </>
                ) : null}


                {/* Theme Toggle */}
                <Button variant="outline" size="sm" onClick={toggleTheme}>
                  {theme === 'light' ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                </Button>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <User className="w-4 h-4 mr-2" />
                      {userProfile?.type === 'mentee' ? 'Mentee' : userProfile?.type === 'mentor' ? 'Mentor' : 'Admin'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleProfileClick}>
                      <User className="w-4 h-4 mr-2" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              // Public Navigation
              <>
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate('/signup/mentee')}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content with optional sidebar */}
      <div className="flex">
        {showSidebar && <GrowthSidebar />}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
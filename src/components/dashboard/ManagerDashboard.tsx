"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/lib/hooks/useRole";
import { createClient } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentDate } from "@/lib/utils/dates";

export function ManagerDashboard() {
  const { user, mounted } = useRole();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState({
    totalMembers: 0,
    pendingApprovals: 0,
    avgAchievement: 0,
    checkinProgress: 0,
    submitted: 0,
    inProgress: 0
  });
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [teamProgress, setTeamProgress] = useState<any[]>([]);

  useEffect(() => {
    if (!mounted || !user) return;
    
    async function loadDashboardData() {
      try {
        setLoading(true);
        
        // Fetch team members
        const { data: members, error: membersError } = await supabase
          .from('users')
          .select('id, name, avatar_initials, profile_pic, departments(name)')
          .eq('manager_id', user.id);
          
        if (membersError) throw membersError;

        // Fetch goals status for team
        const reportIds = members.map(m => m.id);
        let goals: any[] = [];
        if (reportIds.length > 0) {
          const { data: goalsData, error: goalsError } = await supabase
            .from('goals')
            .select('*, thrust_areas(*)')
            .in('employee_id', reportIds);
          if (goalsError) throw goalsError;
          goals = goalsData || [];
        }

        // Fetch achievements for avg score
        const goalIds = goals.map(g => g.id);
        let achievements: any[] = [];
        if (goalIds.length > 0) {
          const { data: achData, error: achievementsError } = await supabase
            .from('goal_achievements')
            .select('score, status, submitted_at, goal_id')
            .in('goal_id', goalIds)
            .eq('quarter', 'Q2');
          if (achievementsError) throw achievementsError;
          achievements = achData || [];
        }

        const pending = members.filter(m => 
          goals.some(g => g.employee_id === m.id && (g.status === 'submitted' || g.status === 'returned'))
        );

        const scores = achievements.map(a => a.score).filter(s => s !== null) as number[];
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        
        const submittedCount = achievements.filter(a => a.submitted_at).length;

        setTeamStats({
          totalMembers: members.length,
          pendingApprovals: pending.length,
          avgAchievement: avgScore,
          checkinProgress: achievements.length > 0 ? Math.round((submittedCount / achievements.length) * 100) : 0,
          submitted: submittedCount,
          inProgress: achievements.filter(a => a.status === 'on_track').length
        });
        
        setPendingMembers(pending.slice(0, 3));

        // Calculate progress tracker for each direct report
        const progressList = members.map(m => {
          const empGoals = goals.filter(g => g.employee_id === m.id);
          const totalGoals = empGoals.length;
          
          if (totalGoals === 0) {
            return {
              id: m.id,
              name: m.name,
              avatar_initials: m.avatar_initials,
              profile_pic: m.profile_pic,
              percentage: 0,
              total: 0,
              completed: 0,
              color: 'red'
            };
          }

          const empGoalIds = empGoals.map(g => g.id);
          const empAchievements = achievements.filter(a => empGoalIds.includes(a.goal_id));
          const completedAchievements = empAchievements.filter(a => a.submitted_at !== null).length;
          const percentage = Math.round((completedAchievements / totalGoals) * 100);

          let color = 'red';
          if (percentage >= 80) color = 'green';
          else if (percentage >= 50) color = 'amber';

          return {
            id: m.id,
            name: m.name,
            avatar_initials: m.avatar_initials,
            profile_pic: m.profile_pic,
            percentage,
            total: totalGoals,
            completed: completedAchievements,
            color
          };
        });

        setTeamProgress(progressList);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load manager dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [mounted, user?.id]);

  const greeting = () => {
    const h = getCurrentDate().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-card border border-primary/20 bg-gradient-to-br from-[#4F46E5] via-[#4338CA] to-[#312E81] p-6 text-white shadow-card md:flex md:items-center md:justify-between md:p-8">
        <div className="space-y-2 md:max-w-md">
          <p className="text-sm font-medium text-white/80">{greeting()}, Manager</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {mounted && user ? user.name.split(" ")[0] : "…"}
          </h1>
          <p className="text-sm text-white/70">
            You have {teamStats.pendingApprovals} team members waiting for goal approval.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link 
              href="/manager/team"
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              Review Goals
            </Link>
            <Link 
              href="/manager/checkins"
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              Track Progress
            </Link>
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center gap-2 md:mt-0">
          <div className="h-20 w-20 rounded-full bg-white/10 p-4 backdrop-blur flex items-center justify-center border border-white/20">
            <BarChart3 className="h-10 w-10 text-white" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Team Performance</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Direct Reports", value: teamStats.totalMembers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pending Approvals", value: teamStats.pendingApprovals, icon: AlertCircle, color: teamStats.pendingApprovals > 0 ? "text-red-600" : "text-green-600", bg: teamStats.pendingApprovals > 0 ? "bg-red-50" : "bg-green-50" },
          { label: "Avg Achievement", value: `${teamStats.avgAchievement}%`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Check-in Progress", value: `${teamStats.checkinProgress}%`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("rounded-lg p-2.5", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-text-primary">{loading ? "—" : stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Approvals List */}
        <Card className="border-border shadow-sm">
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-tight">Pending Approvals</h2>
            <Link href="/manager/team" className="text-xs font-semibold text-primary hover:underline">View All</Link>
          </div>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : pendingMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-100 mb-2" />
                <p className="text-sm text-text-muted">All goals are approved!</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {pendingMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {member.profile_pic && <AvatarImage src={member.profile_pic} alt={member.name} />}
                        <AvatarFallback className="bg-primary-subtle text-primary text-xs font-bold">
                          {member.avatar_initials || member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-text-primary">{member.name}</p>
                        <p className="text-[11px] text-text-muted">{member.departments?.name}</p>
                      </div>
                    </div>
                    <Link href="/manager/team" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                      Review <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Progress Overview */}
        <Card className="border-border shadow-sm">
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-tight">Check-in Completion</h2>
            <Link href="/manager/checkins" className="text-xs font-semibold text-primary hover:underline">Full Report</Link>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase">
                <span className="text-text-secondary">Overall Q2 Submission</span>
                <span className="text-primary">{teamStats.checkinProgress}%</span>
              </div>
              <Progress value={teamStats.checkinProgress} className="h-2 bg-indigo-50" />
            </div>

            {/* Individual Direct Report Progress Bars */}
            <div className="space-y-4 border-t border-border-subtle pt-4">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Direct Reports Completion</p>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : teamProgress.length === 0 ? (
                <p className="text-xs text-text-muted italic">No direct reports found.</p>
              ) : (
                <div className="space-y-3">
                  {teamProgress.map((report) => (
                    <Link
                      key={report.id}
                      href={`/manager/checkins?employeeId=${report.id}`}
                      className="group block rounded-lg border border-border bg-surface-container-lowest p-3 shadow-sm transition-all hover:bg-gray-50/50 hover:shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {report.profile_pic && <AvatarImage src={report.profile_pic} alt={report.name} />}
                            <AvatarFallback className="bg-primary-subtle text-primary text-[10px] font-bold">
                              {report.avatar_initials || report.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                            {report.name}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          report.color === 'green' ? 'bg-green-50 text-green-700' : report.color === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        )}>
                          {report.percentage}% ({report.completed}/{report.total})
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            report.color === 'green' ? 'bg-emerald-500' : report.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                          )}
                          style={{ width: `${report.percentage}%` }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-gray-50 p-4 border border-border flex items-start gap-3">
              <Clock className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-text-primary">Q2 Review Cycle</p>
                <p className="text-[11px] text-text-secondary">The review window will close in 14 days. Ensure all team members submit their actuals by then.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

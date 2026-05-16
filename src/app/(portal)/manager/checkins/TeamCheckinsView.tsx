"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  TrendingUp,
  Search,
  Filter,
  Eye,
  MessageSquare,
  Edit2,
  Check,
  Send
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRole } from "@/lib/hooks/useRole";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { User, Goal, ThrustArea, GoalAchievement, Quarter } from "@/types";

type TeamMemberCheckin = User & {
  departments: { name: string } | null;
  goals: (Goal & { thrust_areas: ThrustArea | null, achievements: GoalAchievement[] })[];
  checkinStatus: 'submitted' | 'in_progress' | 'not_started';
  avgScore: number | null;
  lastUpdated: string | null;
};

export default function TeamCheckinsView() {
  const { user: currentUser, mounted } = useRole();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMemberCheckin[]>([]);
  const [activeQuarter, setActiveQuarter] = useState<Quarter>("Q2");
  const [selectedMember, setSelectedMember] = useState<TeamMemberCheckin | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Comment editing state
  const [editingComment, setEditingComment] = useState<{ goalId: string, text: string } | null>(null);

  const fetchData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    
    try {
      // 1. Fetch direct reports
      const { data: reports, error: reportsError } = await supabase
        .from('users')
        .select('*, departments(name)')
        .eq('manager_id', currentUser.id);

      if (reportsError) throw reportsError;

      // 2. Fetch goals for these reports
      const reportIds = reports.map(r => r.id);
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*, thrust_areas(*)')
        .in('employee_id', reportIds);

      if (goalsError) throw goalsError;

      // 3. Fetch achievements for these goals for the active quarter
      const goalIds = goals.map(g => g.id);
      const { data: achievements, error: achievementsError } = await supabase
        .from('goal_achievements')
        .select('*')
        .eq('quarter', activeQuarter)
        .in('goal_id', goalIds);

      if (achievementsError) throw achievementsError;

      // 4. Fetch manager comments
      const { data: comments, error: commentsError } = await supabase
        .from('checkin_comments')
        .select('*')
        .eq('quarter', activeQuarter)
        .eq('manager_id', currentUser.id)
        .in('goal_id', goalIds);

      if (commentsError) throw commentsError;

      // Map everything together
      const mappedTeam = reports.map(report => {
        const memberGoals = goals
          .filter(g => g.employee_id === report.id)
          .map(g => {
            const goalAchievements = achievements.filter(a => a.goal_id === g.id);
            return { ...g, achievements: goalAchievements };
          });

        const allSubmitted = memberGoals.length > 0 && memberGoals.every(g => g.achievements.some(a => a.submitted_at));
        const anyProgress = memberGoals.some(g => g.achievements.some(a => a.status !== 'not_started'));
        
        let status: 'submitted' | 'in_progress' | 'not_started' = 'not_started';
        if (allSubmitted) status = 'submitted';
        else if (anyProgress) status = 'in_progress';

        const weightedScores = memberGoals
          .map(g => {
            const score = g.achievements[0]?.score;
            if (score === null || score === undefined) return null;
            return (Number(score) * Number(g.weightage)) / 100;
          })
          .filter(s => s !== null) as number[];
        
        const totalWeightage = memberGoals
          .filter(g => g.achievements[0]?.score !== null && g.achievements[0]?.score !== undefined)
          .reduce((sum, g) => sum + Number(g.weightage), 0);

        const avgScore = totalWeightage > 0 ? Math.round(weightedScores.reduce((a, b) => a + b, 0) / (totalWeightage / 100)) : null;
        
        const lastUpdated = achievements
          .filter(a => memberGoals.some(g => g.id === a.goal_id))
          .reduce((latest: string | null, a) => {
            if (!a.updated_at) return latest;
            return !latest || new Date(a.updated_at) > new Date(latest) ? a.updated_at : latest;
          }, null);

        return {
          ...report,
          goals: memberGoals,
          checkinStatus: status,
          avgScore,
          lastUpdated
        };
      });

      setTeam(mappedTeam as any);
    } catch (error) {
      console.error("Error fetching checkin data:", error);
      toast.error("Failed to load check-ins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && currentUser) {
      fetchData();
    }
  }, [currentUser, mounted, activeQuarter]);

  const stats = {
    submitted: team.filter(m => m.checkinStatus === 'submitted').length,
    inProgress: team.filter(m => m.checkinStatus === 'in_progress').length,
    notStarted: team.filter(m => m.checkinStatus === 'not_started').length,
    avgTeamScore: Math.round(team.reduce((sum, m) => sum + (m.avgScore || 0), 0) / (team.filter(m => m.avgScore !== null).length || 1))
  };

  const handleSaveComment = async (goalId: string, comment: string) => {
    try {
      const { error } = await supabase
        .from('checkin_comments')
        .upsert({
          goal_id: goalId,
          manager_id: currentUser.id,
          quarter: activeQuarter,
          comment: comment,
          updated_at: new Date().toISOString()
        }, { onConflict: 'goal_id,manager_id,quarter' });

      if (error) throw error;
      toast.success("Comment saved");
      setEditingComment(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to save comment");
    }
  };

  const handleSendSummary = () => {
    toast.success(`Check-in summary sent to ${selectedMember?.name}`);
  };

  if (loading && !selectedMember) return <div className="p-8">Loading check-ins...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Team Check-ins</h1>
        </div>
        
        {/* Quarter Selector */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          {["Q1", "Q2", "Q3", "Q4"].map((q) => (
            <button
              key={q}
              onClick={() => setActiveQuarter(q as Quarter)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                activeQuarter === q 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-text-secondary hover:text-primary"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </header>

      {/* Overview Strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: "Submitted", value: `${stats.submitted} of ${team.length}`, icon: CheckCircle2, color: "text-green-600" },
          { label: "In Progress", value: `${stats.inProgress} of ${team.length}`, icon: Clock, color: "text-amber-600" },
          { label: "Not Started", value: `${stats.notStarted} of ${team.length}`, icon: AlertCircle, color: "text-gray-400" },
          { label: "Avg Team Score", value: `${stats.avgTeamScore}%`, icon: TrendingUp, color: "text-indigo-600" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={cn("rounded-lg bg-gray-50 p-2", stat.color.replace('text-', 'bg-').replace('600', '100'))}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Table */}
      <Card className="border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Employee</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Dept</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Goals</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Check-in Status</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Avg Score</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Last Updated</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((member) => (
              <TableRow key={member.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary-subtle text-primary text-xs font-bold">
                        {member.avatar_initials || member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-text-primary">{member.name}</span>
                      <span className="text-[10px] text-text-muted">{member.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] h-5 border-none">
                    {member.departments?.name || "Product"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-text-secondary">{member.goals.length} goals</TableCell>
                <TableCell>
                  {member.checkinStatus === 'submitted' ? (
                    <Badge className="bg-green-100 text-green-700 border-none text-[10px] h-6 px-2 font-bold">
                      <Check className="mr-1 h-3 w-3" /> Submitted
                    </Badge>
                  ) : member.checkinStatus === 'in_progress' ? (
                    <Badge className="bg-amber-100 text-amber-700 border-none text-[10px] h-6 px-2 font-bold">
                      ⏳ In Progress
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-400 border-none text-[10px] h-6 px-2 font-bold">
                      — Not Started
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {member.avgScore !== null ? (
                    <ScorePill score={member.avgScore} />
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-text-muted">
                  {member.lastUpdated ? new Date(member.lastUpdated).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary hover:text-primary-hover hover:bg-primary-subtle font-semibold"
                    onClick={() => {
                      setSelectedMember(member);
                      setIsDrawerOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-[500px] p-0 flex flex-col h-full border-l border-border">
          {selectedMember && (
            <>
              <SheetHeader className="p-6 border-b border-border space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-white text-lg font-bold">
                      {selectedMember.avatar_initials || selectedMember.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-xl font-bold">{selectedMember.name}</SheetTitle>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 text-[10px] mt-1 h-5 border-none">
                      {selectedMember.role === 'employee' ? 'Direct Report' : selectedMember.role}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm font-semibold text-text-secondary">{activeQuarter} Check-in Details</p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Score Card */}
                <div className="rounded-xl bg-primary-subtle p-6 flex flex-col items-center text-center">
                  <span className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Weighted Average Score</span>
                  <div className={cn(
                    "text-5xl font-black mb-3",
                    getScoreColor(selectedMember.avgScore || 0)
                  )}>
                    {selectedMember.avgScore || 0}%
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-indigo-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {selectedMember.checkinStatus === 'submitted' ? "Submitted Oct 15" : "Draft Progress"}
                  </div>
                </div>

                {/* Goals Sections */}
                <div className="space-y-6">
                  {selectedMember.goals.map((goal, idx) => {
                    const achievement = goal.achievements[0];
                    const progress = achievement ? (Number(achievement.actual_value) / Number(goal.target_value)) * 100 : 0;
                    
                    return (
                      <div key={goal.id} className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold leading-tight">{goal.title}</h3>
                            <Badge 
                              style={{ backgroundColor: goal.thrust_areas?.bg_color, color: goal.thrust_areas?.color }}
                              className="text-[10px] h-5 border-none"
                            >
                              {goal.thrust_areas?.name}
                            </Badge>
                          </div>
                          {achievement && <ScorePill score={achievement.score || 0} size="lg" />}
                        </div>

                        {!achievement ? (
                          <div className="py-4 text-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-text-muted text-xs">
                            Not submitted yet
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Planned Target</p>
                                <p className="text-sm font-bold">{goal.target_value} <span className="text-[10px] text-text-secondary">{goal.uom_type.replace('_', ' ')}</span></p>
                              </div>
                              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Actual Achievement</p>
                                <p className="text-sm font-bold">{achievement.actual_value || '—'} <span className="text-[10px] text-text-secondary">{goal.uom_type.replace('_', ' ')}</span></p>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-bold uppercase">
                                <span className="text-text-secondary">Progress</span>
                                <span className={getScoreColor(progress)}>{Math.min(100, Math.round(progress))}%</span>
                              </div>
                              <Progress value={Math.min(100, progress)} className="h-1.5" />
                            </div>

                            {/* Manager Comment */}
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1.5">
                                  <MessageSquare className="h-3 w-3" /> Manager Feedback
                                </span>
                                {editingComment?.goalId !== goal.id && (
                                  <button 
                                    className="text-[10px] font-bold text-primary hover:underline"
                                    onClick={() => setEditingComment({ goalId: goal.id, text: goal.manager_comment || "" })}
                                  >
                                    <Edit2 className="h-3 w-3 inline mr-1" /> {goal.manager_comment ? 'Edit' : 'Add'}
                                  </button>
                                )}
                              </div>
                              
                              {editingComment?.goalId === goal.id ? (
                                <div className="space-y-2">
                                  <Textarea 
                                    className="min-h-[80px] text-xs"
                                    placeholder="Add your check-in comment for this goal..."
                                    value={editingComment.text}
                                    onChange={(e) => setEditingComment({...editingComment, text: e.target.value})}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingComment(null)}>Cancel</Button>
                                    <Button size="sm" className="h-7 text-xs bg-primary" onClick={() => handleSaveComment(goal.id, editingComment.text)}>Save Comment</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 rounded-lg bg-gray-100/50 text-xs text-text-secondary italic">
                                  {goal.manager_comment || "No comment added yet."}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {idx < selectedMember.goals.length - 1 && <hr className="border-gray-100" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <SheetFooter className="p-6 border-t border-border bg-gray-50 sm:flex-col gap-2">
                <Button variant="outline" className="w-full border-primary text-primary" onClick={handleSendSummary}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Check-in Summary
                </Button>
                <p className="text-[10px] text-center text-text-muted">Summary will be emailed to {selectedMember.email}</p>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ScorePill({ score, size = "md" }: { score: number, size?: "md" | "lg" }) {
  const colorClass = getScoreColor(score);
  
  return (
    <div className={cn(
      "flex items-center justify-center font-bold rounded-full",
      size === "md" ? "h-8 w-12 text-xs" : "h-12 w-16 text-lg",
      score >= 90 ? "bg-green-100 text-green-700" :
      score >= 70 ? "bg-indigo-100 text-indigo-700" :
      score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
    )}>
      {score}%
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-indigo-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

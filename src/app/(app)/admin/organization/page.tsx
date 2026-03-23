"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Building2, Loader2, Palette, Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { OrganizationMembersSection } from "@/components/admin/OrganizationMembersSection";

export default function AdminOrganizationPage() {
  const router = useRouter();
  const { session } = useAuth();

  const org = useQuery(
    api.admin.getMyOrganization,
    session?.role === "admin" ? {} : "skip",
  );
  const updateOrg = useMutation(api.admin.updateMyOrganization);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [studentDmsEnabled, setStudentDmsEnabled] = useState(false);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [lobbyEnabled, setLobbyEnabled] = useState(true);
  const [maxClassSize, setMaxClassSize] = useState(30);
  const [dataRetentionDays, setDataRetentionDays] = useState(365);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (session && session.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    if (!org) return;
    setName(org.name);
    setSlug(org.slug);
    setLogoUrl(org.logoUrl ?? "");
    setPrimaryColor(org.primaryColor ?? "");
    setStudentDmsEnabled(org.settings.studentDmsEnabled);
    setRecordingEnabled(org.settings.recordingEnabled);
    setLobbyEnabled(org.settings.lobbyEnabled);
    setMaxClassSize(org.settings.maxClassSize);
    setDataRetentionDays(org.settings.dataRetentionDays);
  }, [org]);

  const resetFormFromOrg = () => {
    if (!org) return;
    setName(org.name);
    setSlug(org.slug);
    setLogoUrl(org.logoUrl ?? "");
    setPrimaryColor(org.primaryColor ?? "");
    setStudentDmsEnabled(org.settings.studentDmsEnabled);
    setRecordingEnabled(org.settings.recordingEnabled);
    setLobbyEnabled(org.settings.lobbyEnabled);
    setMaxClassSize(org.settings.maxClassSize);
    setDataRetentionDays(org.settings.dataRetentionDays);
  };

  const handleCancelEdit = () => {
    resetFormFromOrg();
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrg({
        name,
        slug,
        logoUrl: logoUrl.trim() === "" ? null : logoUrl.trim(),
        primaryColor: primaryColor.trim() === "" ? null : primaryColor.trim(),
        settings: {
          studentDmsEnabled,
          recordingEnabled,
          lobbyEnabled,
          maxClassSize,
          dataRetentionDays,
        },
      });
      toast.success("Organization updated");
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!session || session.role !== "admin") {
    return null;
  }

  const canEdit = org !== undefined && org !== null;

  return (
    <div className="w-full px-4 py-6 md:px-6">
      <header className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Admin
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Organization</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && !isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit organization
              </Button>
            )}
            {canEdit && isEditing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="organization-settings-form"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {org === undefined ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading organization…
          </CardContent>
        </Card>
      ) : org === null ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No organization found for your account.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-6">
              {isEditing ? (
                <form
                  id="organization-settings-form"
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSave();
                  }}
                >
                  <Card>
                      <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>
                          How your school appears publicly and in links. The slug is used for
                          multi-tenant URLs and subdomain routing when configured.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            Identity
                          </div>
                          <div className="space-y-4 sm:max-w-xl">
                            <div className="space-y-2">
                              <Label htmlFor="org-name">School name</Label>
                              <Input
                                id="org-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="organization"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="org-slug">Slug</Label>
                              <Input
                                id="org-slug"
                                value={slug}
                                onChange={(e) =>
                                  setSlug(
                                    e.target.value.toLowerCase().replace(/\s+/g, "-"),
                                  )
                                }
                                className="font-mono"
                              />
                              <p className="text-xs text-muted-foreground">
                                Lowercase letters, numbers, and hyphens only. Must be unique.
                              </p>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            Appearance
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="org-logo">Logo URL</Label>
                              <Input
                                id="org-logo"
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                placeholder="https://…"
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="org-color">Primary color</Label>
                              <Input
                                id="org-color"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                placeholder="#3B82F6 or CSS color"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Policies</CardTitle>
                        <CardDescription>
                          Feature flags and limits applied across your organization.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <p className="text-sm font-semibold text-foreground">
                            Communication &amp; video
                          </p>
                          <div className="divide-y divide-border rounded-lg border bg-muted/20">
                            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium">Student DMs</p>
                                <p className="text-sm text-muted-foreground">
                                  Allow direct messages between students (when supported).
                                </p>
                              </div>
                              <Switch
                                checked={studentDmsEnabled}
                                onCheckedChange={setStudentDmsEnabled}
                                className="shrink-0"
                              />
                            </div>
                            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium">Session recording</p>
                                <p className="text-sm text-muted-foreground">
                                  Enable recording features for live classes.
                                </p>
                              </div>
                              <Switch
                                checked={recordingEnabled}
                                onCheckedChange={setRecordingEnabled}
                                className="shrink-0"
                              />
                            </div>
                            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium">Lobby</p>
                                <p className="text-sm text-muted-foreground">
                                  Require lobby admission before joining video sessions.
                                </p>
                              </div>
                              <Switch
                                checked={lobbyEnabled}
                                onCheckedChange={setLobbyEnabled}
                                className="shrink-0"
                              />
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <p className="text-sm font-semibold text-foreground">
                            Limits
                          </p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="max-class">Max class size</Label>
                              <Input
                                id="max-class"
                                type="number"
                                min={1}
                                max={500}
                                value={maxClassSize}
                                onChange={(e) =>
                                  setMaxClassSize(parseInt(e.target.value, 10) || 1)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="retention">Data retention (days)</Label>
                              <Input
                                id="retention"
                                type="number"
                                min={1}
                                value={dataRetentionDays}
                                onChange={(e) =>
                                  setDataRetentionDays(parseInt(e.target.value, 10) || 1)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                </form>
              ) : (
                <>
                  <Card>
                      <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>
                          How your school appears publicly and in links. The slug is used for
                          multi-tenant URLs and subdomain routing when configured.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              Identity
                            </div>
                            <dl className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  School name
                                </dt>
                                <dd className="mt-1 text-base font-medium">{org.name}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Slug
                                </dt>
                                <dd className="mt-1 font-mono text-base">{org.slug}</dd>
                              </div>
                            </dl>
                          </div>
                          <Separator />
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <Palette className="h-4 w-4 text-muted-foreground" />
                              Appearance
                            </div>
                            <dl className="grid gap-4">
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Logo URL
                                </dt>
                                <dd className="mt-1 break-all text-sm">
                                  {org.logoUrl ? (
                                    <a
                                      href={org.logoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary underline underline-offset-4"
                                    >
                                      {org.logoUrl}
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">Not set</span>
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Primary color
                                </dt>
                                <dd className="mt-1 flex flex-wrap items-center gap-2">
                                  {org.primaryColor ? (
                                    <>
                                      <span
                                        className="inline-block h-6 w-6 shrink-0 rounded border border-border"
                                        style={{ backgroundColor: org.primaryColor }}
                                        title={org.primaryColor}
                                      />
                                      <span className="font-mono text-sm">{org.primaryColor}</span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">Not set</span>
                                  )}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Policies</CardTitle>
                        <CardDescription>
                          Feature flags and limits applied across your organization.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <p className="text-sm font-semibold text-foreground">
                            Communication &amp; video
                          </p>
                          <div className="divide-y divide-border rounded-lg border bg-muted/20">
                            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium">Student DMs</p>
                                <p className="text-sm text-muted-foreground">
                                  Allow direct messages between students (when supported).
                                </p>
                              </div>
                              <Badge variant={org.settings.studentDmsEnabled ? "default" : "secondary"}>
                                {org.settings.studentDmsEnabled ? "On" : "Off"}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium">Session recording</p>
                                <p className="text-sm text-muted-foreground">
                                  Enable recording features for live classes.
                                </p>
                              </div>
                              <Badge variant={org.settings.recordingEnabled ? "default" : "secondary"}>
                                {org.settings.recordingEnabled ? "On" : "Off"}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium">Lobby</p>
                                <p className="text-sm text-muted-foreground">
                                  Require lobby admission before joining video sessions.
                                </p>
                              </div>
                              <Badge variant={org.settings.lobbyEnabled ? "default" : "secondary"}>
                                {org.settings.lobbyEnabled ? "On" : "Off"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <p className="text-sm font-semibold text-foreground">
                            Limits
                          </p>
                          <dl className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Max class size
                              </dt>
                              <dd className="mt-1 text-base font-medium tabular-nums">
                                {org.settings.maxClassSize}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Data retention
                              </dt>
                              <dd className="mt-1 text-base font-medium tabular-nums">
                                {org.settings.dataRetentionDays} days
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </CardContent>
                    </Card>
                </>
              )}

            <OrganizationMembersSection />
          </div>
        </>
      )}
    </div>
  );
}

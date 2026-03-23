"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ParentalConsentInputProps {
  birthDate: string;
  onParentEmailChange: (email: string) => void;
  parentEmail: string;
  isUnder13: boolean;
}

export function ParentalConsentInput({
  birthDate,
  onParentEmailChange,
  parentEmail,
  isUnder13,
}: ParentalConsentInputProps) {
  if (!isUnder13) {
    return (
      <Alert className="bg-green-500/10 border-green-500/20">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle>No parental consent required</AlertTitle>
        <AlertDescription>
          You are 13 years or older, so you can create an account without parental consent.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-yellow-500/10 border-yellow-500/20">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertTitle>Parental consent required</AlertTitle>
        <AlertDescription>
          You are under 13 years old. COPPA requires parental consent to create an account.
          We will send a consent email to your parent or guardian.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="parentEmail">
          Parent or Guardian Email <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="parentEmail"
            type="email"
            placeholder="parent@example.com"
            value={parentEmail}
            onChange={(e) => onParentEmailChange(e.target.value)}
            className="pl-9"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          We will send a consent verification email to this address.
        </p>
      </div>
    </div>
  );
}

interface ConsentVerificationProps {
  token: string | null;
}

export function ConsentVerification({ token }: ConsentVerificationProps) {
  const verifyConsent = useMutation(api.auth.verifyParentalConsent);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleVerify = async () => {
    if (!token) return;

    setIsVerifying(true);
    try {
      const response = await verifyConsent({ consentToken: token });
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        message: "An error occurred while verifying consent. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Invalid Consent Link</CardTitle>
          <CardDescription>
            The consent verification link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Please request a new consent email from the student&apos;s account.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (result?.success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Consent Verified!
          </CardTitle>
          <CardDescription>
            You have successfully verified parental consent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-500/10 border-green-500/20">
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>The student can now log in and use Stream School.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Parental Consent Verification</CardTitle>
        <CardDescription>
          As a parent or guardian, please verify that you consent to your child using Stream School.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result && !result.success && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verification Failed</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 text-sm">
          <p>By clicking &quot;Verify Consent&quot;, you confirm that:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>You are the parent or legal guardian of the student</li>
            <li>You consent to your child using Stream School</li>
            <li>You understand that your child&apos;s data will be collected as described in our Privacy Policy</li>
            <li>You can revoke consent at any time by contacting support</li>
          </ul>
        </div>

        <Button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full"
        >
          {isVerifying ? "Verifying..." : "Verify Consent"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface ConsentStatusProps {
  status: "pending" | "approved" | "not_required" | undefined;
  consentVerifiedAt: number | undefined;
}

export function ConsentStatus({ status, consentVerifiedAt }: ConsentStatusProps) {
  if (status === "not_required" || status === undefined) {
    return null;
  }

  if (status === "approved") {
    return (
      <Alert className="bg-green-500/10 border-green-500/20">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle>Parental Consent Approved</AlertTitle>
        <AlertDescription>
          Your parent or guardian has verified consent.
          {consentVerifiedAt && (
            <span className="block text-xs mt-1">
              Verified on {new Date(consentVerifiedAt).toLocaleDateString()}
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-yellow-500/10 border-yellow-500/20">
      <AlertCircle className="h-4 w-4 text-yellow-500" />
      <AlertTitle>Parental Consent Pending</AlertTitle>
      <AlertDescription>
        Please ask your parent or guardian to check their email and verify consent.
        You won&apos;t be able to use Stream School until consent is verified.
      </AlertDescription>
    </Alert>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function useAdminGuard() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const supabase = createClientComponentClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.user) {
                    router.replace("/");
                    return;
                }

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("auth_user_id", session.user.id)
                    .single();

                const role = profile?.role?.toLowerCase?.() || "";

                if (role !== "admin") {
                    router.replace("/");
                    return;
                }

                setIsAdmin(true);
                setLoading(false);
            } catch {
                router.replace("/");
                setLoading(false);
            }
        };

        checkAdmin();
    }, [router]);

    return { isAdmin, loading };
}

import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Test | Space-Quiz",
};

export default function StressTestLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

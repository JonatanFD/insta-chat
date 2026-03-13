import { GithubLight } from "./svgs/githubLight";
import { GithubDark } from "./svgs/githubDark";
import { useTheme } from "../ThemeProvider";

export function GithubLogo(props: React.SVGProps<SVGSVGElement>) {
    const { theme } = useTheme();
    
    // Default to dark icon if theme is unknown
    const isDark = theme === "dark" || theme === "system";

    if (isDark) {
        return <GithubDark {...props} />;
    }

    return <GithubLight {...props} />;
}

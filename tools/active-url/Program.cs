using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Windows.Automation;

static class Program
{
    [DllImport("user32.dll")]
    static extern nint GetForegroundWindow();

    static readonly Regex UrlLike = new(
        @"^(https?:\/\/)?([a-z0-9-]+(\.[a-z0-9-]+)+)(:\d+)?([\/?#].*)?$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    static int Main(string[] args)
    {
        try
        {
            nint hwnd = 0;
            for (var i = 0; i < args.Length; i++)
            {
                if (args[i] is "--hwnd" && i + 1 < args.Length &&
                    long.TryParse(args[i + 1], out var parsed) && parsed != 0)
                {
                    hwnd = (nint)parsed;
                    break;
                }
            }

            if (hwnd == 0)
                hwnd = GetForegroundWindow();

            var url = hwnd == 0 ? null : TryReadUrl(hwnd);
            Console.WriteLine(JsonSerializer.Serialize(new { url }));
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            Console.WriteLine("""{"url":null}""");
            return 1;
        }
    }

    static string? TryReadUrl(nint hwnd)
    {
        AutomationElement? root;
        try
        {
            root = AutomationElement.FromHandle(hwnd);
        }
        catch
        {
            return null;
        }

        if (root is null)
            return null;

        // Prefer named address / omnibox fields (Chrome, Edge, Brave, Firefox).
        var nameHints = new[]
        {
            "Address and search bar",
            "Address bar",
            "Search or enter address",
            "Barre d'adresse et de recherche",
            "Barre d'adresse",
            "Omnibox",
        };

        foreach (var hint in nameHints)
        {
            try
            {
                var cond = new AndCondition(
                    new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit),
                    new PropertyCondition(AutomationElement.NameProperty, hint));
                var el = root.FindFirst(TreeScope.Descendants, cond);
                var v = ReadValue(el);
                if (IsUrl(v))
                    return NormalizeUrl(v!);
            }
            catch
            {
                /* continue */
            }
        }

        // Fallback: first edit whose value looks like a URL / domain.
        try
        {
            var edits = root.FindAll(
                TreeScope.Descendants,
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit));
            if (edits is null)
                return null;

            for (var i = 0; i < edits.Count; i++)
            {
                var v = ReadValue(edits[i]);
                if (IsUrl(v))
                    return NormalizeUrl(v!);
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    static string? ReadValue(AutomationElement? el)
    {
        if (el is null)
            return null;
        try
        {
            if (el.TryGetCurrentPattern(ValuePattern.Pattern, out var raw) &&
                raw is ValuePattern vp)
            {
                var value = vp.Current.Value?.Trim();
                return string.IsNullOrEmpty(value) ? null : value;
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    static bool IsUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;
        if (value.Contains(' ') && !value.Contains('.'))
            return false;
        return UrlLike.IsMatch(value.Trim());
    }

    static string NormalizeUrl(string value)
    {
        var v = value.Trim();
        if (!v.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !v.StartsWith("https://", StringComparison.OrdinalIgnoreCase) &&
            !v.StartsWith("file:", StringComparison.OrdinalIgnoreCase))
        {
            v = "https://" + v;
        }

        return v;
    }
}

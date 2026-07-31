using LibreHardwareMonitor.Hardware;

internal sealed class UpdateVisitor : IVisitor
{
    public void VisitComputer(IComputer computer) => computer.Traverse(this);

    public void VisitHardware(IHardware hardware)
    {
        hardware.Update();
        foreach (var sub in hardware.SubHardware)
            sub.Accept(this);
    }

    public void VisitSensor(ISensor sensor) { }

    public void VisitParameter(IParameter parameter) { }
}

static class Program
{
    static int Main(string[] args)
    {
        var daemon = args.Any(a => a.Equals("--daemon", StringComparison.OrdinalIgnoreCase));
        if (daemon)
            return RunDaemon();
        return WriteOnce(Console.Out) ? 0 : 2;
    }

    static string AppDataDir()
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "lattice-desk");
        Directory.CreateDirectory(dir);
        return dir;
    }

    static string CachePath() => Path.Combine(AppDataDir(), "temp-cache.json");
    static string PidPath() => Path.Combine(AppDataDir(), "cpu-temp.pid");

    static int? ReadCelsius()
    {
        var computer = new Computer { IsCpuEnabled = true };
        computer.Open();
        try
        {
            computer.Accept(new UpdateVisitor());

            float? package = null;
            float? coreAvg = null;
            float? coreMax = null;
            float? any = null;

            var sensors = computer.Hardware
                .Where(h => h.HardwareType == HardwareType.Cpu)
                .SelectMany(h =>
                {
                    h.Update();
                    return h.Sensors;
                });

            foreach (var sensor in sensors)
            {
                if (sensor.SensorType != SensorType.Temperature || sensor.Value is not float value)
                    continue;
                if (value <= 0 || value > 125)
                    continue;

                any ??= value;
                var name = sensor.Name;
                if (name.Contains("Package", StringComparison.OrdinalIgnoreCase) ||
                    name.Contains("Tctl", StringComparison.OrdinalIgnoreCase) ||
                    name.Contains("Tdie", StringComparison.OrdinalIgnoreCase))
                    package = value;
                else if (name.Contains("Core Average", StringComparison.OrdinalIgnoreCase))
                    coreAvg = value;
                else if (name.Contains("Core Max", StringComparison.OrdinalIgnoreCase))
                    coreMax = value;
            }

            var best = package ?? coreAvg ?? coreMax ?? any;
            return best is null ? null : (int)Math.Round(best.Value);
        }
        finally
        {
            computer.Close();
        }
    }

    static bool WriteOnce(TextWriter output)
    {
        try
        {
            var celsius = ReadCelsius();
            if (celsius is null)
            {
                output.WriteLine("{\"ok\":false,\"error\":\"no_sensor\",\"hint\":\"run_as_admin\"}");
                return false;
            }

            var json = $"{{\"ok\":true,\"celsius\":{celsius},\"updatedAt\":\"{DateTime.UtcNow:o}\"}}";
            output.WriteLine(json);
            File.WriteAllText(CachePath(), json);
            return true;
        }
        catch (Exception ex)
        {
            var msg = ex.Message.Replace("\\", "\\\\").Replace("\"", "\\\"");
            output.WriteLine($"{{\"ok\":false,\"error\":\"{msg}\"}}");
            return false;
        }
    }

    static bool IsPidAlive(int pid)
    {
        try
        {
            var p = System.Diagnostics.Process.GetProcessById(pid);
            return !p.HasExited;
        }
        catch
        {
            return false;
        }
    }

    static int RunDaemon()
    {
        if (File.Exists(PidPath()))
        {
            if (int.TryParse(File.ReadAllText(PidPath()).Trim(), out var existing) && IsPidAlive(existing))
                return 0;
        }

        File.WriteAllText(PidPath(), Environment.ProcessId.ToString());
        try
        {
            while (true)
            {
                try
                {
                    using var sw = new StringWriter();
                    WriteOnce(sw);
                }
                catch
                {
                    /* keep running */
                }
                Thread.Sleep(30_000);
            }
        }
        finally
        {
            try { File.Delete(PidPath()); } catch { /* ignore */ }
        }
    }
}

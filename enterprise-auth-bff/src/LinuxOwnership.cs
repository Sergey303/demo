using System.Runtime.InteropServices;

namespace EnterpriseAuthBff;

// Linux statx has a stable, architecture-independent ABI (kernel >= 4.11).
// Missing support fails closed; never infer ownership from Unix mode bits.
internal static class LinuxOwnership
{
    [StructLayout(LayoutKind.Explicit, Size = 256)]
    private struct Statx
    {
        [FieldOffset(0)] public uint Mask;
        [FieldOffset(20)] public uint Uid;
        [FieldOffset(28)] public ushort Mode;
        [FieldOffset(32)] public ulong Inode;
        [FieldOffset(136)] public uint DeviceMajor;
        [FieldOffset(140)] public uint DeviceMinor;
    }
    [DllImport("libc", EntryPoint = "statx", SetLastError = true)]
    private static extern int Stat(int directoryFd, string path, int flags, uint mask, out Statx result);
    [DllImport("libc", EntryPoint = "geteuid")]
    private static extern uint EffectiveUid();

    internal static (ulong Inode, uint Major, uint Minor, ushort Mode) OwnedIdentity(string path)
    {
        if (!OperatingSystem.IsLinux() || Stat(-100, path, 0x100, 0x7ff, out var stat) != 0 ||
            (stat.Mask & 0x10b) != 0x10b || stat.Uid != EffectiveUid())
            throw new InvalidOperationException("Untrusted proxy socket ownership.");
        return (stat.Inode, stat.DeviceMajor, stat.DeviceMinor, stat.Mode);
    }

    internal static bool Trusted(uint owner, uint effective, bool secret) => secret ? owner == effective : owner == 0 || owner == effective;

    public static void RequireTrustedOwner(string path, bool secret)
    {
        // AT_FDCWD, AT_SYMLINK_NOFOLLOW, STATX_UID. Paths checked separately for links.
        if (Stat(-100, path, 0x100, 0x8, out var stat) != 0 || (stat.Mask & 0x8) == 0 ||
            !Trusted(stat.Uid, EffectiveUid(), secret))
            throw new InvalidOperationException("Untrusted session key ownership.");
    }
}

/* Test-only LD_PRELOAD shim: change only the disposable Redis process's
 * calendar clock, not the kernel or monotonic clock. No libc ABI dependency
 * at link time; resolves symbols in the target's musl/glibc at runtime. */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <fcntl.h>
#include <time.h>
#include <sys/time.h>
#include <unistd.h>

static long offset_seconds(void) {
    char buf[32];
    int fd = open("/tmp/edge-clock-offset", O_RDONLY);
    if (fd < 0) return 0;
    ssize_t n = read(fd, buf, sizeof(buf));
    close(fd);
    if (n <= 0) return 0;
    long v = 0;
    int sign = buf[0] == '-' ? -1 : 1;
    for (ssize_t i = sign < 0 ? 1 : 0; i < n && buf[i] >= '0' && buf[i] <= '9'; ++i) {
        v = v * 10 + buf[i] - '0';
        if (v > 86400) return 0;
    }
    return sign * v;
}

int gettimeofday(struct timeval *tv, void *tz) {
    int (*original)(struct timeval *, void *) = dlsym(RTLD_NEXT, "gettimeofday");
    int result = original(tv, tz);
    if (result == 0) tv->tv_sec += offset_seconds();
    return result;
}

int clock_gettime(clockid_t id, struct timespec *ts) {
    int (*original)(clockid_t, struct timespec *) = dlsym(RTLD_NEXT, "clock_gettime");
    int result = original(id, ts);
    if (result == 0 && (id == CLOCK_REALTIME || id == CLOCK_REALTIME_COARSE))
        ts->tv_sec += offset_seconds();
    return result;
}

time_t time(time_t *out) {
    time_t (*original)(time_t *) = dlsym(RTLD_NEXT, "time");
    time_t value = original(0);
    if (value == (time_t)-1) return value;
    value += offset_seconds();
    if (out) *out = value;
    return value;
}

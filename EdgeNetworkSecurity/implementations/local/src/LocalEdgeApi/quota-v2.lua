-- Key: demo:edge:quota:v2:<namespace>. Value: <host monotonic bucket>:<admitted count>.
-- ARGV: permit limit, window in milliseconds, pinned run_id, admit/probe, host monotonic milliseconds.
-- Verify identity and role inside the same atomic execution as admission.
local server = redis.call("INFO", "server")
local runId = string.match(server, "\r\nrun_id:([0-9a-f]+)\r\n")
local replication = redis.call("INFO", "replication")
if not runId or runId ~= ARGV[3] or not string.find(replication, "\r\nrole:master\r\n", 1, true) then
    return redis.error_reply("ERR quota primary not authorized")
end
if ARGV[4] == "probe" then return 1 end
if ARGV[4] ~= "admit" then return redis.error_reply("ERR invalid quota mode") end
local permits = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local nowMs = tonumber(ARGV[5])
if not nowMs or nowMs < 0 or nowMs > 9007199254740991 or nowMs ~= math.floor(nowMs) then
    return redis.error_reply('ERR invalid monotonic sample')
end
local bucket = math.floor(nowMs / windowMs)
local remaining = windowMs - (nowMs % windowMs)
local previous = redis.call('GET', KEYS[1])
local count = 0

if previous then
    local previousBucket, previousCount = string.match(previous, '^(%d+):(%d+)$')
    if not previousBucket then
        return redis.error_reply('ERR invalid quota state')
    end
    previousBucket = tonumber(previousBucket)
    if previousBucket > bucket then
        return redis.error_reply('ERR stale monotonic sample')
    end
    if previousBucket == bucket then
        count = tonumber(previousCount)
    end
end

if count >= permits then
    return {0, remaining}
end

-- Never expire by Redis wall time: a forward/backward jump could otherwise
-- erase the watermark and reopen the same monotonic bucket.
redis.call('SET', KEYS[1], tostring(bucket) .. ':' .. tostring(count + 1))
return {1, remaining}

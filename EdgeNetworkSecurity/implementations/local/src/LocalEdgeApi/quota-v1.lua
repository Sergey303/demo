-- Key: demo:edge:quota:v1:<namespace>. Value: <Redis time bucket>:<admitted count>.
-- ARGV: permit limit, window in milliseconds. Reply: {allowed (0/1), ms to next bucket}.
local permits = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local clock = redis.call('TIME')
local nowMs = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
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
        return redis.error_reply('ERR quota clock moved backwards')
    end
    if previousBucket == bucket then
        count = tonumber(previousCount)
    end
end

if count >= permits then
    return {0, remaining}
end

redis.call('SET', KEYS[1], tostring(bucket) .. ':' .. tostring(count + 1), 'PX', windowMs * 2)
return {1, remaining}

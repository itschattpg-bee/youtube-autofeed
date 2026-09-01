const express=require("express"),path=require("path");require("dotenv").config();
const app=express(),PORT=process.env.PORT||3000,KEY=process.env.YOUTUBE_API_KEY;
app.use(express.static(__dirname));

async function yt(u){
  const r=await fetch(u);
  const d=await r.json();
  if(!r.ok) throw Error(d.error?.message||"YouTube API error");
  return d;
}

async function channel(input){
  input=input.trim();
  let idMatch=input.match(/youtube\.com\/channel\/([A-Za-z0-9_-]+)/i);
  if(idMatch) return idMatch[1];

  let h=input.match(/youtube\.com\/@([A-Za-z0-9._-]+)/i);
  let handle=h?.[1]||(input.startsWith("@")?input.slice(1):input);

  // channels.list costs only 1 quota unit.
  let d=await yt(`https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(handle)}&key=${KEY}`);
  if(!d.items?.length) throw Error("Channel not found");
  return d.items[0].id;
}

app.get("/api/channel",async(req,res)=>{
  try{
    if(!KEY) throw Error("Missing YOUTUBE_API_KEY in .env");
    const id=await channel(req.query.input||"");
    const d=await yt(`https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${id}&key=${KEY}`);
    if(!d.items?.length) throw Error("Channel not found");
    const s=d.items[0].snippet;
    res.json({
      id,
      title:s.title,
      thumbnail:s.thumbnails?.default?.url||"",
      input:req.query.input
    });
  }catch(e){res.status(400).json({error:e.message})}
});

// In-memory cache: prevents every screen refresh from consuming quota.
const cache=new Map();
const CACHE_MS=5*60*1000;

app.get("/api/videos",async(req,res)=>{
  try{
    if(!KEY) throw Error("Missing YOUTUBE_API_KEY in .env");
    const ids=(req.query.channels||"").split(",").filter(Boolean);
    if(!ids.length) return res.json({videos:[]});

    const cacheKey=ids.slice().sort().join(",");
    const cached=cache.get(cacheKey);
    if(cached && Date.now()-cached.time<CACHE_MS) return res.json({videos:cached.videos});

    const after=new Date(Date.now()-30*86400000).toISOString();
    let all=[];

    for(const id of ids){
      // IMPORTANT: Do NOT use search.list here.
      // search.list costs 100 quota units per request.
      // channels.list + playlistItems.list cost 1 unit each.
      const ch=await yt(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${id}&key=${KEY}`);
      const uploads=ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if(!uploads) continue;

      const p=await yt(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploads}&maxResults=50&key=${KEY}`);

      all.push(...(p.items||[])
        .filter(x=>new Date(x.snippet?.publishedAt).getTime()>=new Date(after).getTime())
        .map(x=>({
          id:x.contentDetails.videoId,
          title:x.snippet.title,
          thumbnail:x.snippet.thumbnails?.high?.url||x.snippet.thumbnails?.medium?.url||x.snippet.thumbnails?.default?.url,
          publishedAt:x.snippet.publishedAt,
          channelId:id,
          channelTitle:x.snippet.channelTitle
        })));
    }

    all.sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));
    cache.set(cacheKey,{time:Date.now(),videos:all});
    res.json({videos:all});
  }catch(e){
    res.status(400).json({error:e.message});
  }
});

app.listen(PORT,()=>console.log(`AutoFeed: http://localhost:${PORT}`));

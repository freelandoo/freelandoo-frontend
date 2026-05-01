import type { MetadataRoute } from "next"
import { getBackendApiUrl } from "@/lib/backend"
import { buildProfileUrl, slugify } from "@/lib/slug"

const BASE_URL = "https://www.freelandoo.com.br"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ]

  // fetch machines
  try {
    const machinesRes = await fetch(`${getBackendApiUrl()}/machine`, {
      next: { revalidate: 3600 },
    })
    if (machinesRes.ok) {
      const machines = await machinesRes.json()
      for (const machine of machines) {
        routes.push({
          url: `${BASE_URL}/maquina/${machine.slug}`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 0.8,
        })
      }
    }
  } catch (error) {
    console.error("Error fetching machines for sitemap", error)
  }

  // fetch published profiles
  try {
    let offset = 0
    const limit = 50
    let hasMore = true
    const uniqueCities = new Set<string>()

    while (hasMore) {
      const profilesRes = await fetch(
        `${getBackendApiUrl()}/search?limit=${limit}&offset=${offset}`,
        {
          next: { revalidate: 3600 },
        }
      )
      
      if (!profilesRes.ok) break
      
      const profiles = await profilesRes.json()
      if (!Array.isArray(profiles) || profiles.length === 0) {
        hasMore = false
        break
      }

      for (const profile of profiles) {
        // Collect URLs for [profession]/[city]/[handle]
        const profileUrlPath = buildProfileUrl({
          profession_slug: profile.profession_slug,
          municipio: profile.municipio,
          handle: profile.username,
          sub_profile_slug: profile.sub_profile_slug ?? null,
        })
        
        routes.push({
          url: `${BASE_URL}${profileUrlPath}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        })

        const citySlug = slugify(profile.municipio) || "brasil"
        const profCityKey = `${profile.profession_slug}/${citySlug}`
        if (!uniqueCities.has(profCityKey)) {
          uniqueCities.add(profCityKey)
        }
      }

      if (profiles.length < limit) {
        hasMore = false
      } else {
        offset += limit
      }
    }
    
    // Add unique profession+city combinations to sitemap
    for (const key of uniqueCities) {
      routes.push({
        url: `${BASE_URL}/${key}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }

  } catch (error) {
    console.error("Error fetching profiles for sitemap", error)
  }

  return routes
}

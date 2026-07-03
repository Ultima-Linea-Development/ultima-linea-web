import { getUsersCollection } from "@/lib/server/db";
import { UserDocument } from "@/lib/server/models";
import { buildFlexibleSearchRegexPattern } from "@/lib/search-normalization";

export async function findStaffUserIdsMatchingQuery(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pattern = buildFlexibleSearchRegexPattern(trimmed);
  if (!pattern) return [];

  const collection = await getUsersCollection<UserDocument>();
  const docs = await collection
    .find({
      role: { $in: ["admin", "vendedor"] },
      $or: [
        { email: { $regex: pattern, $options: "i" } },
        { first_name: { $regex: pattern, $options: "i" } },
        { last_name: { $regex: pattern, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$first_name", ""] },
                      " ",
                      { $ifNull: ["$last_name", ""] },
                    ],
                  },
                },
              },
              regex: pattern,
              options: "i",
            },
          },
        },
      ],
    })
    .project({ _id: 1 })
    .toArray();

  return docs.map((doc) => doc._id);
}

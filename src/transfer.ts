import chalk from "chalk"
import * as split2 from "split2"
import { Readable, Writable } from "stream"
import { publishAnimation, pullAnimation } from "./animation"
import Queue from "./queue"
import { State } from "./state"
import { INumberStringHashMap } from "./util"

const description = (id: number) =>
  `Lunar Transfer the anim`

export default function transfer(
  inStream: Readable,
  outStream: Writable,
  state: State,
  concurrent: number,
  existingSet: INumberStringHashMap,
  groupId?: number,
) {
  const queue = new Queue<{ id: number; title: string }>(
    async (d) => {
      const existingItem = existingSet[d.id];

      if(!existingItem) await new Promise(f => setTimeout(f, 1000));

      const result = existingItem ? `${existingItem.newId} - ${existingItem.title} - (${existingItem.oldId})\n` : await publishAnimation(
        state,
        state.failedUploads.has(d.id) ? "Keyframe Sequence" : d.title,
        description(d.id),
        await pullAnimation(d.id),
        groupId
      )
        .then((id) => `${id} - ${d.title} - (${d.id})\n`)
        .catch((e) => {
          state.failedUploads.add(d.id)

          return Promise.reject(e)
        });

      if(existingItem) process.stdout.write("Found an existing item: ");

      process.stdout.write(result);
      outStream.write(result)
    },
    {
      concurrent: concurrent,
      maxRetries: 5,
      retryDelay: 5000,
      maxTimeout: 30000,
    }
  )

  inStream.pipe(split2()).on("data", (line: string) => {
    const words = line.split(" ")
    const id = Number(words.shift())
    const title = words.join(" ").replace("Herring", "FishBird")

    if (Number.isNaN(id)) {
      console.error(chalk.red(`Error in input: id for "${title}" is not valid`))
    } else {
      queue.push({ id, title })
    }
  });

  /*inStream.addListener("data", (data: string) => {
    console.log(data);
  });*/
}

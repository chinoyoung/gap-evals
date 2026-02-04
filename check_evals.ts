import { db } from "./lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

async function check() {
  const q = query(collection(db, "evaluations"));
  const snap = await getDocs(q);
  console.log("Total evaluations:", snap.size);
  snap.docs.forEach(doc => {
    console.log("Doc ID:", doc.id, "Data:", JSON.stringify(doc.data()));
  });
}
check();

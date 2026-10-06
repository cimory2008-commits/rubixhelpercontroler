import { route } from "../lib/util.js";
import { requireUser, publicUser } from "../lib/users.js";

// dipakai aplikasi untuk memastikan sesi masih valid dan akun belum dibanned
export default route(["GET", "POST"], async (req) => ({ user: publicUser(await requireUser(req)) }));

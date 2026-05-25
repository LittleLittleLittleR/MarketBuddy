import { signOut } from "../../lib/supabase";

const Home = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold">Home Page</h1>
      <button type="button" onClick={() => signOut()} style={{ marginLeft: '10px' }}>
        Logout
      </button>

    </div>
  );
};

export default Home;

<?php
session_start();
include "db.php";

$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $email = trim($_POST["email"]);
    $password = $_POST["password"];

    try {

        // ✅ FIND USER
        $sql = "SELECT * FROM users WHERE email = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$email]);

        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // ✅ VERIFY PASSWORD
        if ($user && password_verify($password, $user["password"])) {

            // ✅ SESSION DATA
            $_SESSION["user_id"] = $user["id"];
            $_SESSION["fullname"] = $user["fullname"];
            $_SESSION["email"] = $user["email"];
            $_SESSION["phone"] = $user["phone"];

            header("Location: dashboard.php");
            exit();

        } else {
            $error = "Invalid email or password";
        }

    } catch (PDOException $e) {
        $error = "Database error: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
</head>

<style>
    @keyframes wiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-15deg); }
        75% { transform: rotate(15deg); }
    }

    .wiggle {
        animation: wiggle 0.5s ease-in-out;
    }
</style>

<body class="bg-gradient-to-tr from-[#06231D] to-[#096250]">

    <div class="flex justify-center items-center h-screen">

        <form method="POST" class="bg-white p-8 rounded-lg shadow-lg w-[320px]">

            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                Welcome Back
                <i class="fa-regular fa-face-smile text-green-600" id="smile"></i>
            </h2>

            <input type="email" name="email" placeholder="Email"
                class="border p-2 w-full mb-3 rounded" required>

            <input type="password" name="password" placeholder="Password"
                class="border p-2 w-full mb-3 rounded" required>

            <button type="submit"
                class="bg-blue-600 text-white w-full p-2 rounded hover:bg-blue-500">
                Login
            </button>

            <p class="text-red-500 mt-2 text-sm">
                <?php echo $error; ?>
            </p>

        </form>

    </div>

    <script>
        const smile = document.getElementById("smile");

        setInterval(() => {
            smile.classList.add("wiggle");

            setTimeout(() => {
                smile.classList.remove("wiggle");
            }, 500);

        }, 2000);
    </script>

</body>
</html>
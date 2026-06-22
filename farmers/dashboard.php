<?php

session_start();

// PROTECT DASHBOARD
if ( !isset( $_SESSION[ 'id' ] ) ) {

    header( 'Location: login.php' );

    exit();
}

?>

<!DOCTYPE html>
<html lang='en'>

<head>

    <meta charset='UTF-8'>

    <meta name='viewport' content='width=device-width, initial-scale=1.0'>

    <title>Dashboard</title>

    <script src='https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'></script>
    <script src='https://kit.fontawesome.com/faff1bf098.js' crossorigin='anonymous'></script>
    <script src='https://unpkg.com/lucide@latest'></script>
    <script src='https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js'></script>

    <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
    </head>

</head>

<body class='bg-white'>

    <!-- Sidebar Toggle -->
    <!-- <button
data-drawer-target = 'default-sidebar'
data-drawer-toggle = 'default-sidebar'
aria-controls = 'default-sidebar'
type = 'button'

class = 'md:hidden inline-flex items-center p-2 mt-3 ms-3 text-sm text-purple-900 rounded-lg hover:bg-gray-200 focus:outline-none'>
<span class = 'sr-only'>Open sidebar</span>

<i class = 'fa-solid fa-bars text-2xl'></i>
</button>  -->

    <!-- SIDEBAR -->
    <aside id='default-sidebar'
        class='fixed top-0 left-0 z-40 w-44 h-screen transition-transform -translate-x-full sm:translate-x-0'
        aria-label='Sidebar'>
        <div class='h-full px-3 py-4 overflow-y-hidden  bg-gray-50'>
            <div class='flex gap-2 text-blue-800 items-center text-lg p-2 mb-10 animate__hinge'>
                <svg xmlns='http://www.w3.org/2000/svg' width='21' height='21' viewBox='0 0 24 24' fill='none'
                    stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'
                    class='lucide lucide-graduation-cap-icon lucide-graduation-cap'>
                    <path
                        d='M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z' />
                    <path d='M22 10v6' />
                    <path d='M6 12.5V16a6 3 0 0 0 12 0v-3.5' />
                </svg>
                <h4 class='text-sm font-bold text-black font-[nothing-writing, sana-serif]'>Student Portal</h4>
            </div>

            <ul class='space-y-2 font-medium items-center'>
                <li class='mb-5' id="dashboard_btn">
                    <a href='#' class='flex bg-blue-100 rounded items-center p-2 text-blue-700 gap-1 '>
                        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'
                            stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'
                            class='lucide lucide-house-icon lucide-house'>
                            <path d='M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' />
                            <path
                                d='M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
                        </svg> <span class='ml-1 font-[sans-serif] font-semibold '>Dashboard</span>
                    </a>
                </li>
                <li class='mb-5'>
                    <a href='#' class='flex items-center p-2 text-gray-900 gap-1  '>
                        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'
                            stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'
                            class='lucide lucide-book-open-icon lucide-book-open'>
                            <path d='M12 7v14' />
                            <path
                                d="M3 18a1 1 0 0 1-1-1V4a1 1 
                        0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                        </svg> <span class='ml-1'>My Courses</span>
                    </a>
                </li>
                <li class='mb-3'>
                    <a href='#' class='flex items-center p-2 text-gray-900 gap-1 '>
                        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'
                            stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'
                            class='lucide lucide-calendar-check2-icon lucide-calendar-check-2'>
                            <path d='M8 2v4' />
                            <path d='M16 2v4' />
                            <path d='M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8' />
                            <path d='M3 10h18' />
                            <path d='m16 20 2 2 4-4' />
                        </svg> <span class='ml-1'>Schedule</span>
                    </a>
                </li>
                <li class='mb-3'>
                    <a href='#' class='flex items-center p-2 text-gray-900 gap-1 '>
                        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'
                            stroke='currentColor' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'
                            class='lucide lucide-chart-no-axes-column-icon lucide-chart-no-axes-column'>
                            <path d='M5 21v-6' />
                            <path d='M12 21V3' />
                            <path d='M19 21V9' />
                        </svg> <span class='ml-1'>Grades</span>
                    </a>
                </li>
                <li class='mb-3'>
                    <a href='#' class='flex items-center p-2 text-gray-900 gap-1 '><svg
                            xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'
                            stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'
                            class='lucide lucide-book-a-icon lucide-book-a'>
                            <path
                                d='M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20' />
                            <path d='m8 13 4-7 4 7' />
                            <path d='M9.1 11h5.7' />
                        </svg> <span class='ml-1'>Assignments</span></a>
                </li>
                <li class='mb-3'>
                    <a href='#' class='flex items-center p-2 text-gray-900 gap-1 '><svg
                            xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'
                            stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'
                            class='lucide lucide-message-circle-icon lucide-message-circle'>
                            <path
                                d='M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719' />
                        </svg> <span class='ml-1'>Message</span> </a>
                </li>
                <li class='mb-3'>
                    <a href="up" class='flex items-center p-2 text-gray-900 gap-1 '><svg
                            xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'
                            stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'
                            class='lucide lucide-user-round-pen-icon lucide-user-round-pen'>
                            <path d='M2 21a8 8 0 0 1 10.821-7.487' />
                            <path
                                d='M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z' />
                            <circle cx='10' cy='8' r='5' />
                        </svg> <span class='ml-1'>Profile</span> </a>
                </li>
                <li class='mt-20'>
                    <a href='logout.php' class=' text-gray-800 p-2 flex items-center gap-1'>
                        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'
                            stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'
                            class='lucide lucide-log-out-icon lucide-log-out'>
                            <path d='m16 17 5-5-5-5' />
                            <path d='M21 12H9' />
                            <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
                        </svg> <span class=' text-black ml-1'>Logout</span>
                    </a>
                </li>
            </ul>
        </div>
    </aside>

    <!-- NAVBAR -->
    <nav class='p-2 flex  justify-between items-center lg:ml-44 mb:m-33 sm:ml-43'>
        <div class=' flex items-start gap-3 relative'>
            <div class='flex-col ml-2'>
                <h2 class='text-2xl font-bold text-black'>

                    Welcome,
                    <?php echo $_SESSION[ 'fullname' ];
?>!👋
                </h2>

                <p class='text-gray-800 mt-[0.8]'>

                    Student ID:
                    <?php echo $_SESSION[ 'id' ];
?>

                </p>
            </div>

        </div>

        <div class=''> <img src="../uploads/<?php echo $_SESSION['passport']; ?>"
                class='w-10 h-10 rounded-full object-cover border-4 border-indigo-300 '></div>
    </nav>

    <div id='home'>

        <!--Dashboard Informations-->
        <div class='grid lg:grid-cols-4 px-4 py-6 lg:ml-44 md:ml-33 sm:ml-43  gap-4'>
            <div class='bg-white p-5 rounded-lg shadow-md'>
                <div class='flex items-center gap-2 text-blue-500'>
                    <svg xmlns='http://www.w3.org/2000/svg' width='46' height='46' viewBox='0 0 24 24' fill='none'
                        stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'
                        class='lucide lucide-book-open-icon lucide-book-open bg-blue-100 p-3 rounded'>
                        <path d='M12 7v14' />
                        <path
                            d="M3 18a1 1 0 0 1-1-1V4a1 1 
                        0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                    </svg>
                    <div class=''>
                        <h5 class='text-sm font-semibold text-black'>Course</h5>
                        <p class='text-3xl mt-2 mb-2 font-bold text-blue-500'>5</p> <span
                            class='text-sm font-semibold text-black'>Active courses</span>
                    </div>
                </div>
            </div>
            <div class='bg-white p-5 rounded-lg shadow-md'>
                <div class='flex items-center gap-2 text-green-700'>
                    <svg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 24 24' fill='none'
                        stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'
                        class='lucide lucide-book-check-icon lucide-book-check bg-green-100 p-3 rounded'>
                        <path
                            d='M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20' />
                        <path d='m9 9.5 2 2 4-4' />
                    </svg>
                    <div class='text-gray-800 '>
                        <h5 class='text-sm font-semibold'>Assignment</h5>
                        <p class='text-3xl mt-2 mb-2 font-bold text-green-500'>3</p><span
                            class='text-sm font-semibold'>Due
                            this week</span> <span class='text-red-500 font-bold'>!</span>
                    </div>
                </div>
            </div>
            <div class='bg-white p-5 rounded-lg shadow-md'>
                <div class='flex items-center gap-2 text-yellow-500'>
                    <svg xmlns='http://www.w3.org/2000/svg' width='46' height='46' viewBox='0 0 24 24' fill='none'
                        stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'
                        class='lucide lucide-star-icon lucide-star bg-yellow-100 p-3 rounded'>
                        <path
                            d='M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' />
                    </svg>
                    <div class='text-gray-800 '>
                        <h5 class='text-sm font-semibold'>Average Grades</h5>
                        <p class='text-3xl mt-2 mb-2 font-bold text-yellow-400'>89%</p><span
                            class='text-sm font-semibold'>Overall average</span> <span
                            class='text-green-500 font-bold'>✓</span>
                    </div>
                </div>
            </div>
            <div class='bg-white p-5 rounded-lg shadow-md'>
                <div class='flex items-center gap-2 text-indigo-500'>
                    <svg xmlns='http://www.w3.org/2000/svg' width='46' height='46' fill='currentColor'
                        viewBox='0 0 24 24' class=' bg-indigo-100 p-3 rounded'>

                        <!--Boxicons v3.0.8 https://boxicons.com | License  https://docs.boxicons.com/free-->
                        <path
                            d='m10.15 11.62 1.85-.97 1.85.97-.35-2.06L15 8.09l-2.07-.3L12 5.92l-.93 1.87-2.07.3 1.5 1.47z'>
                        </path>
                        <path
                            d='M21 4h-3V3c0-.55-.45-1-1-1H7c-.55 0-1 .45-1 1v1H3c-.55 0-1 .45-1 1v3c0 4.29 1.79 6.88 4.81 6.99A6 6 0 0 0 11 17.91V20H8v2h8v-2h-3v-2.09a5.98 5.98 0 0 0 4.19-2.92C20.2 14.88 22 12.29 22 8V5c0-.55-.45-1-1-1M4 8V6h2v6c0 .28.03.56.06.83C4.22 12.12 4 9.31 4 8m12 4c0 2.21-1.79 4-4 4s-4-1.79-4-4V4h8zm4-4c0 1.31-.22 4.12-2.06 4.83.04-.27.06-.55.06-.83V6h2z'>
                        </path>
                    </svg>

                    <div class='text-gray-800 '>
                        <h5 class='text-sm font-semibold'>Achievemnts</h5>
                        <p class='text-3xl mt-2 mb-2 font-bold text-indigo-800'>8</p><span
                            class='text-sm font-semibold'>Badges earned</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Dashboard Content -->
        <div class='grid lg:grid-cols-3 px-6 py-10 lg:ml-44 md:ml-33 sm:ml-43  gap-4'>

            <div class='bg-white p-2 rounded-lg shadow-md'>
                <div class='flex justify-between items-center mb-4 mt-3'>
                    <h3 class='text-md font-bold'>Upcoming Assignment</h3>
                    <a href='#' class='text-blue-700 text-xs font-bold'>View All</a>
                </div>

                <div
                    class='bg-white p-2 rounded-md shadow flex items-center gap-3 mb-4 transition duration-300 hover:scale-105'>

                    <div class='flex flex-col items-start mb-2'>
                        <h4 class='text-sm font-bold'>Math Homework</h4>
                        <span class='text-gray-600'>Mathematics</span>
                    </div>
                    <div class='ml-auto text-sm text-gray-500 flex flex-col items-end'>
                        <span class='text-sm text-gray-500'>Due</span>
                        <span class='text-red-500 font-bold text-md'>May 20</span>
                    </div>
                </div>

                <div
                    class='bg-white p-2 rounded-lg shadow flex items-center gap-3 mb-4 transition duration-300 hover:scale-105'>
                    <div class='flex flex-col items-start mb-2'>
                        <h4 class='text-sm font-bold'>Physics Lab Report</h4>
                        <span class='text-gray-600'>Physics</span>
                    </div>
                    <div class='ml-auto text-sm text-gray-500 flex flex-col items-end'>
                        <span class='text-sm text-gray-500'>Due</span>
                        <span class='text-red-500 font-bold text-md'>May 23</span>
                    </div>
                </div>

                <div
                    class='bg-white p-2 rounded-md shadow flex items-center gap-3 mb-12 transition duration-300 hover:scale-105'>
                    <div class='flex flex-col items-start '>
                        <h4 class='text-sm font-bold'>English Essay</h4>
                        <span class='text-gray-600'>English Literature</span>
                    </div>
                    <div class='ml-auto text-sm text-gray-500 flex flex-col items-end'>
                        <span class='text-sm text-gray-500'>Due</span>
                        <span class='text-red-500 font-bold text-md'>May 25</span>
                    </div>
                </div>
                <div class="mb-4 ml-2"><span class="text-blue-600 font-bold cursor-pointer">View all assignments</span>
                </div>
            </div>

            <div class='bg-white p-4 rounded-lg shadow-md'>
                <div class='flex justify-between items-center mb-4 mt-3'>
                    <h3 class='text-md font-bold'>Course Progress</h3>
                    <a href='#' class='text-blue-700 text-xs font-bold'>View All</a>
                </div>

                <div class='flex flex-col gap-3'>

                    <div>
                        <div class='flex justify-between mb-6'>
                            <span class='text-sm font-bold'>Mathematics</span>
                            <span class='text-sm font-bold text-green-600'>96%</span>
                        </div>
                        <div class='w-full bg-gray-200 rounded-full h-2.5'>
                            <div class="bg-green-600 h-2.5 rounded-full" style="width: 96%;"></div>
                        </div>
                    </div>

                    <div>
                        <div class='flex justify-between mb-6'>
                            <span class='text-sm font-bold'>Physics</span>
                            <span class='text-sm font-bold text-blue-600'>86%</span>
                        </div>
                        <div class='w-full bg-gray-200 rounded-full h-2.5'>
                            <div class="bg-blue-600 h-2.5 rounded-full" style="width: 86%;"></div>
                        </div>
                    </div>

                    <div>
                        <div class='flex justify-between mb-6'>
                            <span class='text-sm font-bold'>English Lit</span>
                            <span class='text-sm font-bold text-indigo-700'>76%</span>
                        </div>
                        <div class='w-full bg-gray-200 rounded-full h-2.5'>
                            <div class="bg-indigo-700 h-2.5 rounded-full" style="width: 76%;"></div>
                        </div>
                    </div>

                    <div>
                        <div class='flex justify-between mb-6'>
                            <span class='text-sm font-bold'>Computer Sci</span>
                            <span class='text-sm font-bold text-yellow-400'>89%</span>
                        </div>
                        <div class='w-full bg-gray-200 rounded-full h-2.5'>
                            <div class="bg-yellow-500 h-2.5 rounded-full" style="width: 89%;"></div>
                        </div>
                    </div>
                    <div class="mb-4 ml-2 mt-3"><span class="text-blue-600 font-bold cursor-pointer">View all
                            assignments</span>
                    </div>
                </div>


            </div>
            <div class='bg-white p-2 rounded-lg shadow-md'>
                <div class='flex justify-between items-center mb-4 mt-3'>
                    <h3 class='text-md font-bold'>Schedule Overview</h3>
                    <a href='#' class='text-blue-700 text-xs font-bold'>View All</a>
                </div>
                <div class="bg-white rounded-xl shadow-md p-5">
                    <div class="flex items-center justify-between mb-4 gap-3">
                        <button id="addTaskBtn" class="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
                            Add
                        </button>



                        <input type="text" id="taskInput" placeholder="Enter a task..."
                            class="flex-1 w-10 border  rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <ul id="taskList" class="space-y-2"></ul>
                </div>
            </div>

        </div>

        <script>
            const taskInput = document.getElementById("taskInput");
            const addTaskBtn = document.getElementById("addTaskBtn");
            const taskList = document.getElementById("taskList");

            addTaskBtn.addEventListener("click", addTask);

            function addTask() {
                const taskText = taskInput.value.trim();

                if (taskText === "") return;

                const li = document.createElement("li");

                li.className =
                    "flex items-center justify-between bg-gray-100 p-3 rounded-lg";

                li.innerHTML = `
        <div class="flex items-center gap-3">
            <input type="checkbox" class="task-check">
            <span class="task-text">${taskText}</span>
        </div>

        <button class="delete-btn text-red-500 hover:text-red-700">
            Delete
        </button>
    `;

                const checkbox = li.querySelector(".task-check");
                const taskTextElement = li.querySelector(".task-text");

                checkbox.addEventListener("change", () => {
                    taskTextElement.classList.toggle("line-through");
                    taskTextElement.classList.toggle("text-gray-500");
                });

                li.querySelector(".delete-btn").addEventListener("click", () => {
                    li.remove();
                });

                taskList.appendChild(li);

                taskInput.value = "";
            }
        </script>

</body>

</html>
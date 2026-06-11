# Gazebo vs Other Physics Simulators

Gazebo (Ignition) is an open-source 3D robotics simulator developed by Open Robotics,
released under Apache 2.0. It is the standard simulation environment for the ROS ecosystem.

## Comparison Matrix

| Feature | Gazebo | MuJoCo | Isaac Sim / Lab | PyBullet |
|---------|--------|--------|------------------|----------|
| License | Apache 2.0 | Apache 2.0 | NVIDIA EULA | MIT |
| ROS integration | Native | No | No | No |
| Sensor models | Full (cam, lidar, IMU, GPS) | Minimal | Full | Basic |
| Physics backend | ODE, DART, Bullet | Native C/C++ | PhysX | Bullet |
| Differentiable | No | Yes | No | No |
| GPU parallel | No | Yes | Yes (Omniverse) | No |
| Python API | ROS/C++ bridge | Native ctypes | Yes | Yes |
| Headless | Yes | Yes | Yes | Yes |
| Sim speed | 0.5-1x realtime | 10-50x realtime | 1-5x realtime | 2-10x realtime |
| URDF support | Yes | Yes | Yes | Yes |
| SDF format | Yes, native | No | No | No |
| MJCF format | No | Yes, native | No | No |
| Terrain/heightfield | Full (textures) | Limited | Full | Yes |
| Multi-robot | Native | No | Yes | No |
| RL ecosystem | Small | DM Control Suite | Isaac Gym/Lab | PyBullet Gym |
| Windows support | Partial | Yes | Yes | Yes |
| Startup time | 10-60s | < 1s | 30-120s | < 1s |
| Package size | ~2 GB | ~10 MB | ~10 GB | ~5 MB |
| Plugin system | Yes (C++) | No | Yes (Python) | No |
| Physics plugins | Buoyancy, aerodynamics | No | No | No |

## When to Use Gazebo

**Best for:**
- Robot-in-the-loop testing with ROS 2
- Sensor validation (cameras, lidar, IMU, GPS, sonar)
- Multi-robot coordination and swarm simulation
- Outdoor environments with terrain rendering
- Projects already invested in the ROS ecosystem
- Plugin-based sensor models (C++ API)
- Community robot support (Clearpath, ARL, fetch, etc.)

**Not ideal for:**
- Fast parallel RL training (10-50x slower than MuJoCo)
- Differentiable physics pipelines
- Minimal-dependency setups (requires Gazebo runtime)
- Headless-only CI (install size is ~2 GB)
- Pure Python API (requires ROS/C++ bridge)

## When to Use MuJoCo Instead

- You need fast simulation (10-50x realtime)
- You need differentiable physics for trajectory optimization
- You want a pip-install experience with no binary dependencies
- You are doing RL training at scale (1000s of parallel envs)
- You only need rigid-body dynamics, not sensor simulation

## When to Use Isaac Sim Instead

- You have NVIDIA GPUs and want photorealistic rendering
- You need synthetic data generation for perception training
- You want integrated RL training (Isaac Gym/Lab)
- You need domain randomization with RTX rendering

## When to Use PyBullet Instead

- You want the simplest possible Python API
- You need quick-and-dirty physics for RL prototyping
- You need soft body simulation (PyBullet is better here)

## Key Differentiators for Gazebo

**Sensor Simulation**: Gazebo is unmatched for sensor-rich simulation.
Native support for:
- RGB and depth cameras with distortion, noise, and blur
- 2D and 3D lidar with ray tracing
- IMU with bias and noise models
- GPS with dilution of precision
- Sonar and pressure sensors
- Contact and force-torque sensors

**ROS 2 Integration**: Gazebo is the only simulator with first-class ROS 2 support.
All sensor data is published on ROS 2 topics automatically. The `ros2_gz_bridge`
handles bidirectional communication between ROS 2 and Gazebo.

**SDF Format**: Gazebo's Simulation Description Format (SDF) is more comprehensive than URDF:
- Full world description (lights, physics, terrain)
- Sensor specifications (camera, lidar, IMU, etc.)
- Plugin architecture for custom behaviour
- Actor and pedestrian models
- Built-in terrain and heightfield support
- Model databases via Gazebo Fuel

**Plugin System**: Gazebo supports C++ plugins that extend simulation at every level:
- World plugins (physics, lighting, scripting)
- Model plugins (control, sensors, actuators)
- System plugins (GUI, networking, logging)
- Sensor plugins (custom noise models, post-processing)

## Decision Flowchart

```
Need camera/lidar/IMU sensor models?             -> Gazebo
Need ROS 2 integration?                           -> Gazebo
Need multi-robot simulation?                      -> Gazebo
Need differentiable physics?                      -> MuJoCo
Need GPU-parallel RL training?                    -> MuJoCo or Isaac
Need photorealistic rendering?                    -> Isaac Sim
Need soft body simulation?                        -> PyBullet or MuJoCo
Need fast prototyping, no dependencies?           -> MuJoCo or PyBullet
Need terrain, outdoor environments?               -> Gazebo
Need synthetic data for perception?               -> Isaac Sim
Need to simulate 1000s of envs in parallel?       -> MuJoCo
Only have a CPU laptop?                           -> MuJoCo or PyBullet
```

## References

- Gazebo: https://gazebosim.org
- MuJoCo: https://mujoco.org, https://github.com/google-deepmind/mujoco
- Isaac Sim: https://developer.nvidia.com/isaac-sim
- PyBullet: https://pybullet.org
